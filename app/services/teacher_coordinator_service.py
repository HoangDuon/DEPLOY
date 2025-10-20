from fastapi import HTTPException, status as fastapi_status
from datetime import datetime
from app.models.class_ import Class
from app.models.grade import Grade
from app.models.attendance import Attendance, AttendanceStatus
from app.models.lecturer import Lecturer
from app.models.student import Student
from app.models.ticket import Ticket
from sqlalchemy import func
from app.models.lecturers_attendance import LecturersAttendance, LecturerAttendanceStatus
from app.models.class_assignment import ClassAssignment
from app.models.notification import Notification
from app.models.user import User
from app.db.database import SessionLocal
from datetime import datetime, timedelta
from typing import Optional
import re

# == Thời khoá biểu
def get_classes():
    db = SessionLocal() 
    results = db.query(
        Class, 
        User.name
    ).join(
        Lecturer, Class.lecturer_id == Lecturer.lecturer_id
    ).join(
        User, Lecturer.user_id == User.user_id
    ).all()

    # 2. Tạo danh sách kết quả từ dữ liệu đã query
    class_list = [
        {
            "class_id": cls.class_id,
            "class_name": cls.class_name,
            "schedule": cls.schedule,
            "lecturer_name": lecturer_name,
            "status": cls.status
        }
        for cls, lecturer_name in results 
    ]

    return class_list

def check_schedule_conflict_single_column(
    new_start_time: datetime,
    place: str,
    current_class_id: int = None
) -> bool:
    db = SessionLocal() 
    """
    Kiểm tra xung đột dựa trên một cột 'schedule' (start_time) duy nhất
    và một quy tắc ngầm về thời lượng (2 giờ).
    """
    # 1. Chuẩn hóa thời gian bắt đầu của lớp mới (loại bỏ giây)
    normalized_new_start = new_start_time.replace(second=0, microsecond=0)
    normalized_new_end = normalized_new_start + timedelta(hours=2)

    # 2. Truy vấn để tìm các lớp có khả năng xung đột (bộ lọc thô trên DB)
    # Cửa sổ tìm kiếm vẫn giữ nguyên để không bỏ sót trường hợp nào
    potential_conflict_window_start = normalized_new_start - timedelta(hours=2)
    
    query = db.query(Class).filter(
        Class.place == place,
        Class.schedule < normalized_new_end,
        Class.schedule >= potential_conflict_window_start
    )

    if current_class_id:
        query = query.filter(Class.class_id != current_class_id)

    potential_classes = query.all()

    # 3. Lặp qua các lớp và so sánh chính xác đến từng phút
    for existing_class in potential_classes:
        # Chuẩn hóa thời gian bắt đầu của lớp đã có
        normalized_existing_start = existing_class.schedule.replace(second=0, microsecond=0)
        normalized_existing_end = normalized_existing_start + timedelta(hours=2)

        # Logic kiểm tra 2 khoảng thời gian giao nhau (đã được chuẩn hóa)
        # (StartA < EndB) AND (EndA > StartB)
        if (normalized_new_start < normalized_existing_end and 
            normalized_new_end > normalized_existing_start):
            return True # Tìm thấy xung đột

    return False # Không có xung đột

def make_class(user_id: int, class_name: str, schedule: datetime, status: str,lecturer_id: int, place: str):
    db = SessionLocal() 
    creator = db.query(User).filter(User.user_id == user_id).first()
    if not creator:
        raise HTTPException(
            status_code=fastapi_status.HTTP_404_NOT_FOUND,
            detail="Creator (user) not found."
        )

    if lecturer_id is not None:
        lecturer = db.query(Lecturer).filter(Lecturer.lecturer_id == lecturer_id).first()
        if not lecturer:
            raise HTTPException(
                status_code=fastapi_status.HTTP_404_NOT_FOUND,
                detail=f"Lecturer with lecturer_id {lecturer_id} not found."
            )

    # 3. Xác thực trạng thái đầu vào.
    if status not in ['active', 'archived','pending']:
        raise HTTPException(
            status_code=fastapi_status.HTTP_400_BAD_REQUEST,
            detail="Invalid status. Must be 'active' or 'archived'."
        )
    
    if place:
        is_conflict = check_schedule_conflict_single_column(
            new_start_time=schedule,
            place=place
        )
        if is_conflict:
            raise HTTPException(
                status_code=fastapi_status.HTTP_409_CONFLICT,
                detail=f"Schedule conflict detected at '{place}' for the 2-hour slot starting at {schedule.strftime('%Y-%m-%d %H:%M')}."
            )

    # Nếu không có xung đột, tạo lớp mới
    new_class = Class(
        class_name=class_name,
        schedule=schedule, # Chỉ lưu thời gian bắt đầu
        status=status,
        created_by=user_id,
        lecturer_id=lecturer_id,
        place=place
    )
    
    db.add(new_class)
    db.commit()
    db.refresh(new_class)
    return new_class

def change_class(
    user_id: int,
    class_id: int, # Bắt buộc phải có để biết cập nhật lớp nào
    # Tất cả các trường khác là tùy chọn
    class_name: Optional[str] = None,
    schedule: Optional[datetime] = None,
    status: Optional[str] = None,
    lecturer_id: Optional[int] = None,
    place: Optional[str] = None
):
    db = SessionLocal() 
    """
    Cập nhật thông tin của một lớp học đã tồn tại.

    Args:
        class_id (int): ID của lớp học cần cập nhật.
        db (Session): Phiên làm việc với database.
        ... các trường thông tin mới (tùy chọn) ...

    Returns:
        Class: Đối tượng lớp học sau khi đã được cập nhật.
    """
    # 1. Tìm lớp học cần cập nhật trong database.
    # 1. Tìm lớp học cần cập nhật trong database.
    class_to_update = db.query(Class).filter(Class.class_id == class_id).first()

    if not class_to_update:
        raise HTTPException(
            status_code=fastapi_status.HTTP_404_NOT_FOUND,
            detail=f"Class with ID {class_id} not found."
        )

    # 2. Kiểm tra xung đột lịch (nếu lịch hoặc địa điểm thay đổi).
    if schedule is not None or place is not None:
        final_schedule = schedule if schedule is not None else class_to_update.schedule
        final_place = place if place is not None else class_to_update.place

        if final_place:
            is_conflict = check_schedule_conflict_single_column(
                new_start_time=final_schedule,
                place=final_place,
                current_class_id=class_id 
            )
            if is_conflict:
                raise HTTPException(
                    status_code=fastapi_status.HTTP_409_CONFLICT,
                    detail=f"Schedule conflict detected at '{final_place}' for the provided time."
                )

    # 3. Cập nhật từng trường nếu giá trị mới được cung cấp.
    if class_name is not None:
        class_to_update.class_name = class_name
    if schedule is not None:
        class_to_update.schedule = schedule
    if status is not None:
        if status not in ['active', 'archived', 'pending']:
            raise HTTPException(status_code=400, detail="Invalid status.")
        class_to_update.status = status
    
    # Xử lý lecturer_id: có thể là một ID mới hoặc None (gỡ giảng viên)
    if lecturer_id is not None:
        lecturer = db.query(Lecturer).filter(Lecturer.lecturer_id == lecturer_id).first()
        if not lecturer:
            raise HTTPException(status_code=404, detail=f"Lecturer with ID {lecturer_id} not found.")
        class_to_update.lecturer_id = lecturer_id
    else:
        # Nếu lecturer_id được truyền vào là None, gán nó là None
        class_to_update.lecturer_id = None
        
    if place is not None:
        class_to_update.place = place

    # 4. Ghi nhận người đã thực hiện thay đổi vào cột created_by.
    class_to_update.created_by = user_id

    # 5. Lưu các thay đổi vào database.
    db.commit()
    db.refresh(class_to_update)

    return class_to_update

def change_status_class(
    user_id: int,
    class_id: int,
):
    db = SessionLocal() 
    """
    Cập nhật thông tin của một lớp học đã tồn tại.

    Args:
        class_id (int): ID của lớp học cần cập nhật.
        db (Session): Phiên làm việc với database.
        ... các trường thông tin mới (tùy chọn) ...

    Returns:
        Class: Đối tượng lớp học sau khi đã được cập nhật.
    """
    # 1. Tìm lớp học cần cập nhật.
    class_to_toggle = db.query(Class).filter(Class.class_id == class_id).first()
    if not class_to_toggle:
        raise HTTPException(
            status_code=fastapi_status.HTTP_404_NOT_FOUND,
            detail=f"Class with ID {class_id} not found."
        )

    # # 2. Xác thực quyền: Người dùng phải là giảng viên của lớp này.
    # lecturer = db.query(Lecturer).filter(Lecturer.user_id == user_id).first()
    # if not lecturer or class_to_toggle.lecturer_id != lecturer.lecturer_id:
    #     raise HTTPException(
    #         status_code=fastapi_status.HTTP_403_FORBIDDEN,
    #         detail="You do not have permission to change the status of this class."
    #     )

    # 3. Logic "bật/tắt"
    current_status = class_to_toggle.status.name
    new_status = None

    if current_status == 'active':
        new_status = 'archived'  # Nếu đang 'active' -> chuyển thành 'archived'
    elif current_status == 'archived':
        new_status = 'active'    # Nếu đang 'archived' -> chuyển thành 'active'
    else:
        # Xử lý các trường hợp khác (ví dụ: 'pending')
        raise HTTPException(
            status_code=fastapi_status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot toggle status for a class that is currently '{current_status}'."
        )
        
    # 4. Cập nhật trạng thái và lưu thay đổi.
    class_to_toggle.status = new_status
    db.commit()
    db.refresh(class_to_toggle)

    return {"message": f"Class status has been toggled to '{new_status}'."}

def make_notify(
    user_id: int,
    title: str,
    message: str,
):
    db = SessionLocal() 
    new_notification = Notification(
            user_id=user_id,
            title=title,
            message=message
        )

    db.add(new_notification)
    
    db.commit()
    
    db.refresh(new_notification)
    
    return new_notification

def view_tickets():
    db = SessionLocal() 
    tickets = db.query(Ticket).order_by(Ticket.created_at.desc()).all()
    return tickets

def change_status_tickets(ticket_id: int, new_status: str):
    db = SessionLocal() 
    # 1. Xác thực trạng thái mới (có thể bỏ qua nếu đã validate ở endpoint)
    valid_statuses = {'open', 'in_progress', 'resolved'}
    if new_status not in valid_statuses:
        raise HTTPException(
            status_code=fastapi_status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status '{new_status}'. Must be one of: {', '.join(valid_statuses)}"
        )

    # 2. Tìm ticket trong database.
    ticket_to_update = db.query(Ticket).filter(Ticket.ticket_id == ticket_id).first()
    if not ticket_to_update:
        raise HTTPException(
            status_code=fastapi_status.HTTP_404_NOT_FOUND,
            detail=f"Ticket with ID {ticket_id} not found."
        )

    # 3. Cập nhật trạng thái.
    ticket_to_update.status = new_status

    # 4. Tự động cập nhật resolved_at.
    if new_status == 'resolved':
        ticket_to_update.resolved_at = datetime.now()
    else:
        # Nếu ticket được mở lại, xóa ngày hoàn thành
        ticket_to_update.resolved_at = None

    # 5. Commit và refresh để lưu thay đổi.
    db.commit()
    db.refresh(ticket_to_update)
    
    return ticket_to_update

def view_teacher_performance(user_id: int):
    db = SessionLocal() 
    
    # 1. Tìm giảng viên và lấy tên của họ (JOIN với bảng User)
    lecturer_info = db.query(
        Lecturer, 
        User.name
    ).join(
        User, Lecturer.user_id == User.user_id
    ).filter(
        Lecturer.user_id == user_id
    ).first()

    if not lecturer_info:
        raise HTTPException(
            status_code=fastapi_status.HTTP_404_NOT_FOUND,
            detail="Lecturer not found for the given user ID"
        )
    
    lecturer = lecturer_info[0]
    lecturer_name = lecturer_info[1]

    # 2. Thống kê "Ngày dạy", "Ngày nghỉ" từ bảng điểm danh giảng viên
    attendance_stats = db.query(
        LecturersAttendance.status, 
        func.count(LecturersAttendance.status).label("count")
    ).filter(
        LecturersAttendance.lecturer_id == lecturer.lecturer_id
    ).group_by(
        LecturersAttendance.status
    ).all()
    
    # Xử lý kết quả thống kê
    teaching_attendance = {
        "present_days": 0,
        "absent_days": 0,
        "late_days": 0
    }
    for stat in attendance_stats:
        if stat.status == LecturerAttendanceStatus.present:
            teaching_attendance["present_days"] = stat.count
        elif stat.status == LecturerAttendanceStatus.absent:
            teaching_attendance["absent_days"] = stat.count
        elif stat.status == LecturerAttendanceStatus.late:
            teaching_attendance["late_days"] = stat.count

    # 3. Thống kê số lượng lớp học
    active_classes_count = db.query(Class).filter(
        Class.lecturer_id == lecturer.lecturer_id,
        Class.status == 'active'
    ).count()
    
    archived_classes_count = db.query(Class).filter(
        Class.lecturer_id == lecturer.lecturer_id,
        Class.status == 'archived'
    ).count()

    # 4. Thống kê "Điểm số của lớp" (Điểm trung bình của tất cả sinh viên)
    #    JOIN từ Grade -> ClassAssignment -> Class
    average_grade = db.query(
        func.avg(Grade.grade)
    ).join(
        ClassAssignment, Grade.assignment_id == ClassAssignment.assignment_id
    ).join(
        Class, ClassAssignment.class_id == Class.class_id
    ).filter(
        Class.lecturer_id == lecturer.lecturer_id
    ).scalar() # Lấy về một giá trị duy nhất

    # 5. Tạo báo cáo cuối cùng
    performance_report = {
        "lecturer_id": lecturer.lecturer_id,
        "lecturer_name": lecturer_name,
        "teaching_attendance": teaching_attendance,
        "class_overview": {
            "active_classes": active_classes_count,
            "archived_classes": archived_classes_count
        },
        "student_performance": {
            # Làm tròn điểm trung bình đến 2 chữ số
            "average_grade_all_classes": round(average_grade, 2) if average_grade else 0.0
        }
    }
    
    return performance_report
    
def get_unassigned_classes():
    db = SessionLocal()
    # SQLAlchemy sẽ tự động dịch `== None` thành `IS NULL` trong SQL
    unassigned_classes = db.query(Class).filter(
        Class.lecturer_id == None,
        Class.status.in_(['active', 'pending']) # Chỉ lấy các lớp cần gán
    ).all()
    
    return unassigned_classes

def check_lecturer_schedule_conflict(
    lecturer_id: int,
    new_start_time: datetime,
    current_class_id: int = None # Dùng khi cập nhật, để loại trừ chính nó
) -> bool:
    db = SessionLocal()
    """
    Kiểm tra xem giảng viên đã bị trùng lịch vào thời điểm này chưa.
    Bỏ qua giây khi so sánh.
    """
    # 1. Chuẩn hóa thời gian của lớp mới (loại bỏ giây)
    normalized_new_start = new_start_time.replace(second=0, microsecond=0)
    normalized_new_end = normalized_new_start + timedelta(hours=2)

    # 2. Lấy tất cả các lớp 'active' khác mà giảng viên này đang dạy
    query = db.query(Class).filter(
        Class.lecturer_id == lecturer_id,
        Class.status == 'active'
    )
    
    # Nếu đang cập nhật, loại trừ chính lớp này
    if current_class_id:
        query = query.filter(Class.class_id != current_class_id)
        
    existing_classes = query.all()

    # 3. So sánh từng lớp đã có với lớp mới
    for existing_class in existing_classes:
        # Chuẩn hóa thời gian của lớp đã có
        normalized_existing_start = existing_class.schedule.replace(second=0, microsecond=0)
        normalized_existing_end = normalized_existing_start + timedelta(hours=2)

        # Logic kiểm tra 2 khoảng thời gian giao nhau
        # (StartA < EndB) AND (EndA > StartB)
        if (normalized_new_start < normalized_existing_end and 
            normalized_new_end > normalized_existing_start):
            return True # Tìm thấy xung đột

    return False # Không có xung đột

def assign_teacher_to_class(
    user_id: int,
    class_id: int):
    db = SessionLocal()
    """
    Gán một giảng viên vào một lớp học đã có và kiểm tra trùng lịch.

    Args:
        lecturer_id (int): ID của giảng viên (từ bảng LECTURERS) sẽ được gán.
        class_id (int): ID của lớp học cần được gán.
        db (Session): Phiên làm việc với database.

    Returns:
        Class: Đối tượng lớp học sau khi đã được cập nhật.
    """
    # 1. Tìm thông tin giảng viên từ user_id.
    lecturer = db.query(Lecturer).filter(Lecturer.user_id == user_id).first()
    if not lecturer:
        raise HTTPException(
            status_code=fastapi_status.HTTP_404_NOT_FOUND,
            detail=f"Lecturer not found for the given user ID {user_id}."
        )

    # 2. Tìm lớp học
    class_to_assign = db.query(Class).filter(Class.class_id == class_id).first()
    if not class_to_assign:
        raise HTTPException(
            status_code=fastapi_status.HTTP_404_NOT_FOUND,
            detail=f"Class with ID {class_id} not found."
        )

    # 3. Kiểm tra xem lớp đã có ai dạy chưa
    if class_to_assign.lecturer_id is not None:
        raise HTTPException(
            status_code=fastapi_status.HTTP_409_CONFLICT,
            detail=f"Class is already assigned to lecturer ID {class_to_assign.lecturer_id}."
        )

    # 4. ❗ KIỂM TRA XUNG ĐỘT LỊCH CỦA GIẢNG VIÊN
    #    Sử dụng lecturer.lecturer_id của giảng viên vừa tìm được
    is_conflict = check_lecturer_schedule_conflict(
        lecturer_id=lecturer.lecturer_id,
        new_start_time=class_to_assign.schedule, # Lấy lịch của lớp sắp gán
    )

    if is_conflict:
        raise HTTPException(
            status_code=fastapi_status.HTTP_409_CONFLICT,
            detail=f"Lecturer schedule conflict. The lecturer is already busy at this time."
        )

    # 5. Nếu không có lỗi, gán giảng viên và lưu
    class_to_assign.lecturer_id = lecturer.lecturer_id
    db.commit()
    db.refresh(class_to_assign)

    return class_to_assign

def get_class_assignment_requests():
    db = SessionLocal()
# Truy vấn các ticket, JOIN với bảng User để lấy tên người gửi
    requests = db.query(
        Ticket,
        User.name
    ).join(
        User, Ticket.submitted_by == User.user_id
    ).filter(
        Ticket.issue_type == 'Class Request',
        Ticket.status == 'open' # Chỉ lấy các yêu cầu đang mở, chưa được duyệt
    ).all()
    
    # Định dạng lại kết quả trả về cho rõ ràng
    result_list = [
        {
            "ticket_id": ticket.ticket_id,
            "submitted_by_user_id": ticket.submitted_by,
            "submitted_by_name": user_name,
            "title": ticket.title,
            "description": ticket.description,
            "created_at": ticket.created_at
        }
        for ticket, user_name in requests
    ]

    return result_list

def _parse_class_id_from_ticket(title: str) -> Optional[int]:
    """Trích xuất Class ID từ chuỗi tiêu đề (ví dụ: '... Class ID: 7')."""
    match = re.search(r"Class ID: (\d+)", title)
    if match:
        try:
            return int(match.group(1))
        except ValueError:
            return None
    return None

def approve_class_assignment_request(
    ticket_id: int
):
    db = SessionLocal()
    # 1. Tìm ticket và kiểm tra
    ticket = db.query(Ticket).filter(Ticket.ticket_id == ticket_id).first()
    if not ticket:
        raise HTTPException(
            status_code=fastapi_status.HTTP_404_NOT_FOUND,
            detail=f"Ticket with ID {ticket_id} not found."
        )
    
    if ticket.issue_type != 'Class Request':
        raise HTTPException(
            status_code=fastapi_status.HTTP_400_BAD_REQUEST,
            detail="This is not a class assignment ticket."
        )

    if ticket.status.name != 'open': # Giả sử model Ticket dùng Python Enum
        raise HTTPException(
            status_code=fastapi_status.HTTP_409_CONFLICT,
            detail=f"Ticket is already '{ticket.status.name}', not 'open'."
        )

    # 2. Lấy thông tin từ ticket
    lecturer_user_id = ticket.submitted_by
    class_id = _parse_class_id_from_ticket(ticket.title)

    if not class_id:
        raise HTTPException(
            status_code=fastapi_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not parse class_id from ticket title: {ticket.title}"
        )

    # 3. Tìm giảng viên và lớp học tương ứng
    lecturer = db.query(Lecturer).filter(Lecturer.user_id == lecturer_user_id).first()
    if not lecturer:
        raise HTTPException(
            status_code=fastapi_status.HTTP_404_NOT_FOUND,
            detail=f"Requesting lecturer (user_id: {lecturer_user_id}) not found in Lecturers table."
        )

    class_to_assign = db.query(Class).filter(Class.class_id == class_id).first()
    if not class_to_assign:
        raise HTTPException(
            status_code=fastapi_status.HTTP_404_NOT_FOUND,
            detail=f"Class with ID {class_id} (from ticket) not found."
        )

    # 4. Kiểm tra logic nghiệp vụ: Lớp có còn trống không?
    if class_to_assign.lecturer_id is not None:
        raise HTTPException(
            status_code=fastapi_status.HTTP_409_CONFLICT,
            detail=f"Class (ID: {class_id}) is no longer unassigned. It's already assigned to lecturer ID {class_to_assign.lecturer_id}."
        )

    # 5. Kiểm tra logic nghiệp vụ: Giảng viên có bị trùng lịch không?
    is_conflict = check_lecturer_schedule_conflict(
        lecturer_id=lecturer.lecturer_id,
        new_start_time=class_to_assign.schedule, # Lấy lịch của lớp sắp gán
    )
    
    if is_conflict:
        raise HTTPException(
            status_code=fastapi_status.HTTP_409_CONFLICT,
            detail=f"Lecturer schedule conflict. Approving this request would cause a schedule clash."
        )

    # 6. Mọi thứ hợp lệ -> Thực hiện 2 hành động trong một giao dịch
    try:
        # Hành động 1: Gán giảng viên vào lớp
        class_to_assign.lecturer_id = lecturer.lecturer_id
        
        # Hành động 2: Đóng ticket
        ticket.status = 'resolved'
        ticket.resolved_at = datetime.now()

        # 7. Commit cả 2 thay đổi
        db.commit()
    
    except Exception as e:
        db.rollback() # Hoàn tác nếu có lỗi
        raise HTTPException(
            status_code=fastapi_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred during the transaction: {e}"
        )

    return {"message": f"Successfully approved request. Lecturer (ID: {lecturer.lecturer_id}) assigned to class (ID: {class_id}). Ticket (ID: {ticket_id}) resolved."}

def take_lecturer_attendance(
    lecturer_id: int,
    class_id: int,
    attendance_status: str,
    notes: Optional[str] = None
):
    db = SessionLocal()
    """
    Điểm danh cho một giảng viên tại một lớp học, tự động lấy ngày hiện tại.

    Args:
        lecturer_id (int): ID của giảng viên (từ bảng LECTURERS).
        class_id (int): ID của lớp học.
        attendance_status (str): Trạng thái ('present', 'absent', 'late').
        db (Session): Phiên làm việc với database.
        notes (Optional[str]): Ghi chú thêm.

    Returns:
        LecturersAttendance: Bản ghi điểm danh vừa được tạo.
    """
    
    # 1. Tự động lấy ngày hiện tại
    today = datetime.today()

    # 2. Kiểm tra trạng thái đầu vào có hợp lệ không
    valid_statuses = [s.value for s in LecturerAttendanceStatus]
    if attendance_status not in valid_statuses:
        raise HTTPException(
            status_code=fastapi_status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
        )

    # 3. Kiểm tra xem Lớp học và Giảng viên có tồn tại không
    lecturer = db.query(Lecturer).filter(Lecturer.lecturer_id == lecturer_id).first()
    if not lecturer:
        raise HTTPException(
            status_code=fastapi_status.HTTP_404_NOT_FOUND,
            detail=f"Lecturer with ID {lecturer_id} not found."
        )

    class_to_attend = db.query(Class).filter(Class.class_id == class_id).first()
    if not class_to_attend:
        raise HTTPException(
            status_code=fastapi_status.HTTP_404_NOT_FOUND,
            detail=f"Class with ID {class_id} not found."
        )

    # 4. Kiểm tra giảng viên có được gán cho lớp này không?
    if class_to_attend.lecturer_id != lecturer.lecturer_id:
        raise HTTPException(
            status_code=fastapi_status.HTTP_403_FORBIDDEN,
            detail=f"Lecturer (ID: {lecturer_id}) is not assigned to this class (ID: {class_id})."
        )

    # 5. Kiểm tra xem đã điểm danh hôm đó chưa (dùng 'today')
    existing_record = db.query(LecturersAttendance).filter(
        LecturersAttendance.lecturer_id == lecturer_id,
        LecturersAttendance.class_id == class_id,
        LecturersAttendance.attendance_date == today  # Sử dụng ngày hiện tại
    ).first()

    if existing_record:
        raise HTTPException(
            status_code=fastapi_status.HTTP_409_CONFLICT,
            detail=f"Attendance has already been taken for this lecturer in this class on {today}."
        )

    # 6. Tạo bản ghi điểm danh mới (dùng 'today')
    new_attendance_record = LecturersAttendance(
        lecturer_id=lecturer_id,
        class_id=class_id,
        attendance_date=today,  # Sử dụng ngày hiện tại
        status=attendance_status,
        notes=notes
    )
    
    db.add(new_attendance_record)
    db.commit()
    db.refresh(new_attendance_record)

    return new_attendance_record
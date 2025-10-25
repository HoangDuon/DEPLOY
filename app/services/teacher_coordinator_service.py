from fastapi import HTTPException, status as fastapi_status
from sqlalchemy.orm import Session  # <<< THÊM VÀO
from datetime import datetime, timedelta
from typing import Optional, List # <<< THÊM VÀO
import re
import json # <<< THÊM VÀO (Cho _parse_class_id_from_ticket nếu cần)

# Import models
from app.models.class_ import Class
from app.models.grade import Grade
from app.models.attendance import Attendance, AttendanceStatus
from app.models.lecturer import Lecturer
from app.models.student import Student
from app.models.ticket import Ticket, TicketStatus # <<< THÊM VÀO TicketStatus
from sqlalchemy import func
from app.models.lecturers_attendance import LecturersAttendance, LecturerAttendanceStatus
from app.models.class_assignment import ClassAssignment
from app.models.notification import Notification
from app.models.user import User
from typing import List, Optional, Dict

# from app.db.database import SessionLocal # <<< XÓA ĐI

# == Thời khoá biểu
# <<< THÊM (db: Session)
def get_classes(db: Session):
    # db = SessionLocal() # <<< XÓA
    results = db.query(
        Class, 
        User.name
    ).join(
        Lecturer, Class.lecturer_id == Lecturer.lecturer_id
    ).join(
        User, Lecturer.user_id == User.user_id
    ).all()

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
    # db.close() # <<< XÓA
    return class_list

# <<< THÊM (db: Session)
def check_schedule_conflict_single_column(
    db: Session, 
    new_start_time: datetime,
    place: str,
    current_class_id: int = None
) -> bool:
    # db = SessionLocal() # <<< XÓA
    """Kiểm tra xung đột lịch phòng học."""
    normalized_new_start = new_start_time.replace(second=0, microsecond=0)
    normalized_new_end = normalized_new_start + timedelta(hours=2)

    potential_conflict_window_start = normalized_new_start - timedelta(hours=2)
    
    query = db.query(Class).filter(
        Class.place == place,
        Class.schedule < normalized_new_end,
        Class.schedule >= potential_conflict_window_start
    )

    if current_class_id:
        query = query.filter(Class.class_id != current_class_id)

    potential_classes = query.all()

    for existing_class in potential_classes:
        normalized_existing_start = existing_class.schedule.replace(second=0, microsecond=0)
        normalized_existing_end = normalized_existing_start + timedelta(hours=2)

        if (normalized_new_start < normalized_existing_end and 
            normalized_new_end > normalized_existing_start):
            # db.close() # <<< XÓA (nếu có)
            return True 
    # db.close() # <<< XÓA (nếu có)
    return False

# <<< THÊM (db: Session)
def check_lecturer_schedule_conflict(
    db: Session,
    lecturer_id: int,
    new_start_time: datetime,
    current_class_id: int = None # Dùng khi cập nhật, để loại trừ chính nó
) -> bool:
    # db = SessionLocal() # <<< XÓA
    """Kiểm tra xung đột lịch giảng viên."""
    normalized_new_start = new_start_time.replace(second=0, microsecond=0)
    normalized_new_end = normalized_new_start + timedelta(hours=2)

    query = db.query(Class).filter(
        Class.lecturer_id == lecturer_id,
        Class.status == 'active' # Chỉ kiểm tra với các lớp đang hoạt động
    )
    
    if current_class_id:
        query = query.filter(Class.class_id != current_class_id)
        
    existing_classes = query.all()

    for existing_class in existing_classes:
        normalized_existing_start = existing_class.schedule.replace(second=0, microsecond=0)
        normalized_existing_end = normalized_existing_start + timedelta(hours=2)

        if (normalized_new_start < normalized_existing_end and 
            normalized_new_end > normalized_existing_start):
            # db.close() # <<< XÓA (nếu có)
            return True 

    # db.close() # <<< XÓA (nếu có)
    return False

# <<< THÊM (db: Session)
def make_class(db: Session, user_id: int, class_name: str, schedule: datetime, status: str, lecturer_id: int, place: str):
    # db = SessionLocal() # <<< XÓA
    try:
        creator = db.query(User).filter(User.user_id == user_id).first()
        if not creator:
            raise HTTPException(status_code=fastapi_status.HTTP_404_NOT_FOUND, detail="Creator (user) not found.")

        lecturer = None
        if lecturer_id is not None:
            lecturer = db.query(Lecturer).filter(Lecturer.lecturer_id == lecturer_id).first()
            if not lecturer:
                raise HTTPException(status_code=fastapi_status.HTTP_404_NOT_FOUND, detail=f"Lecturer with lecturer_id {lecturer_id} not found.")

        if status not in ['active', 'archived','pending']:
            raise HTTPException(status_code=fastapi_status.HTTP_400_BAD_REQUEST, detail="Invalid status. Must be 'active', 'archived', or 'pending'.")
        
        # Kiểm tra xung đột phòng học
        if place:
            is_place_conflict = check_schedule_conflict_single_column(
                db, # <<< TRUYỀN db
                new_start_time=schedule,
                place=place
            )
            if is_place_conflict:
                raise HTTPException(status_code=fastapi_status.HTTP_409_CONFLICT, detail=f"Place schedule conflict detected at '{place}' for the slot starting at {schedule.strftime('%Y-%m-%d %H:%M')}.")

        # Kiểm tra xung đột lịch giảng viên (nếu có giảng viên)
        if lecturer:
            is_lecturer_conflict = check_lecturer_schedule_conflict(
                db, # <<< TRUYỀN db
                lecturer_id=lecturer.lecturer_id,
                new_start_time=schedule
            )
            if is_lecturer_conflict:
                 raise HTTPException(status_code=fastapi_status.HTTP_409_CONFLICT, detail=f"Lecturer schedule conflict for lecturer ID {lecturer_id} at the specified time.")


        new_class = Class(
            class_name=class_name,
            schedule=schedule, 
            status=status,
            created_by=user_id,
            lecturer_id=lecturer_id, # Lưu lecturer_id (có thể None)
            place=place
        )
        
        db.add(new_class)
        db.commit()
        db.refresh(new_class)
        return new_class
    except Exception as e:
        db.rollback()
        raise e # Ném lại lỗi để router xử lý
    # finally: # <<< XÓA
    #     db.close() # <<< XÓA

# <<< THÊM (db: Session)
def change_class(
    db: Session,
    user_id: int, # Người thực hiện thay đổi
    class_id: int, 
    class_name: Optional[str] = None,
    schedule: Optional[datetime] = None,
    status: Optional[str] = None,
    lecturer_id: Optional[int] = None, # Cho phép gán None để gỡ GV
    place: Optional[str] = None
):
    # db = SessionLocal() # <<< XÓA
    try:
        class_to_update = db.query(Class).filter(Class.class_id == class_id).first()
        if not class_to_update:
            raise HTTPException(status_code=fastapi_status.HTTP_404_NOT_FOUND, detail=f"Class with ID {class_id} not found.")

        # Xác định lịch và địa điểm cuối cùng để kiểm tra
        final_schedule = schedule if schedule is not None else class_to_update.schedule
        final_place = place if place is not None else class_to_update.place
        final_lecturer_id = lecturer_id if lecturer_id is not None else class_to_update.lecturer_id # Giữ lại lecturer cũ nếu không đổi

        # Kiểm tra xung đột phòng học nếu lịch hoặc địa điểm thay đổi
        if schedule is not None or place is not None:
             if final_place: # Chỉ kiểm tra nếu có địa điểm
                is_place_conflict = check_schedule_conflict_single_column(
                    db, # <<< TRUYỀN db
                    new_start_time=final_schedule,
                    place=final_place,
                    current_class_id=class_id 
                )
                if is_place_conflict:
                    raise HTTPException(status_code=fastapi_status.HTTP_409_CONFLICT, detail=f"Place schedule conflict detected at '{final_place}' for the provided time.")

        # Kiểm tra xung đột lịch giảng viên nếu lịch hoặc giảng viên thay đổi
        if schedule is not None or lecturer_id is not None:
             if final_lecturer_id: # Chỉ kiểm tra nếu có giảng viên được gán
                 is_lecturer_conflict = check_lecturer_schedule_conflict(
                     db, # <<< TRUYỀN db
                     lecturer_id=final_lecturer_id,
                     new_start_time=final_schedule,
                     current_class_id=class_id
                 )
                 if is_lecturer_conflict:
                     raise HTTPException(status_code=fastapi_status.HTTP_409_CONFLICT, detail=f"Lecturer schedule conflict for lecturer ID {final_lecturer_id} at the specified time.")

        # Cập nhật các trường
        if class_name is not None:
            class_to_update.class_name = class_name
        if schedule is not None:
            class_to_update.schedule = schedule
        if status is not None:
            if status not in ['active', 'archived', 'pending']:
                raise HTTPException(status_code=400, detail="Invalid status.")
            class_to_update.status = status
        
        # Xử lý lecturer_id: kiểm tra nếu là ID mới, gán None nếu được truyền vào là None
        if lecturer_id is not None:
            lecturer = db.query(Lecturer).filter(Lecturer.lecturer_id == lecturer_id).first()
            if not lecturer:
                 raise HTTPException(status_code=404, detail=f"Lecturer with ID {lecturer_id} not found.")
            class_to_update.lecturer_id = lecturer_id
        # Nếu lecturer_id KHÔNG được truyền (None), nhưng final_lecturer_id là None (tức là muốn gỡ)
        elif final_lecturer_id is None: 
            class_to_update.lecturer_id = None
            
        if place is not None:
            class_to_update.place = place

        class_to_update.created_by = user_id # Ghi nhận người sửa cuối cùng

        db.commit()
        db.refresh(class_to_update)
        return class_to_update
    except Exception as e:
        db.rollback()
        raise e
    # finally: # <<< XÓA
    #     db.close() # <<< XÓA


# <<< THÊM (db: Session)
def change_status_class(
    db: Session,
    user_id: int, # Ai là người thực hiện
    class_id: int,
):
    # db = SessionLocal() # <<< XÓA
    try:
        class_to_toggle = db.query(Class).filter(Class.class_id == class_id).first()
        if not class_to_toggle:
            raise HTTPException(status_code=fastapi_status.HTTP_404_NOT_FOUND, detail=f"Class with ID {class_id} not found.")

        # Logic "bật/tắt"
        # Giả định status là string ('active', 'archived', 'pending')
        current_status = class_to_toggle.status 
        new_status = None

        if current_status == 'active':
            new_status = 'archived'
        elif current_status == 'archived':
            new_status = 'active'
        elif current_status == 'pending':
             new_status = 'active' # Từ pending -> active
        else:
            raise HTTPException(status_code=fastapi_status.HTTP_400_BAD_REQUEST, detail=f"Cannot toggle status for a class that is currently '{current_status}'.")
            
        class_to_toggle.status = new_status
        db.commit()
        db.refresh(class_to_toggle)
        return {"message": f"Class status has been changed to '{new_status}'."}
    except Exception as e:
        db.rollback()
        raise e
    # finally: # <<< XÓA
    #     db.close() # <<< XÓA

# <<< THÊM (db: Session)
def make_notify(
    db: Session,
    user_id: int, # Người tạo thông báo
    title: str,
    message: str,
):
    # db = SessionLocal() # <<< XÓA
    try:
        new_notification = Notification(
                user_id=user_id, # Liên kết với người tạo
                title=title,
                message=message,
                created_at=datetime.now() # Tự động lấy thời gian hiện tại
            )
        db.add(new_notification)
        db.commit()
        db.refresh(new_notification)
        return new_notification
    except Exception as e:
        db.rollback()
        raise e
    # finally: # <<< XÓA
    #     db.close() # <<< XÓA

# <<< THÊM (db: Session)
def view_tickets(db: Session):
    # db = SessionLocal() # <<< XÓA
    tickets = db.query(Ticket).order_by(Ticket.created_at.desc()).all()
    # db.close() # <<< XÓA
    return tickets

# <<< THÊM (db: Session)
def change_status_tickets(db: Session, ticket_id: int, new_status: str):
    # db = SessionLocal() # <<< XÓA
    try:
        # Giả định new_status là string 'open', 'in_progress', 'resolved'
        valid_statuses = {'open', 'in_progress', 'resolved'}
        if new_status not in valid_statuses:
            raise HTTPException(status_code=fastapi_status.HTTP_400_BAD_REQUEST, detail=f"Invalid status '{new_status}'. Must be one of: {', '.join(valid_statuses)}")

        ticket_to_update = db.query(Ticket).filter(Ticket.ticket_id == ticket_id).first()
        if not ticket_to_update:
            raise HTTPException(status_code=fastapi_status.HTTP_404_NOT_FOUND, detail=f"Ticket with ID {ticket_id} not found.")

        ticket_to_update.status = new_status # Gán string trực tiếp

        if new_status == 'resolved':
            ticket_to_update.resolved_at = datetime.now()
        else:
            ticket_to_update.resolved_at = None

        db.commit()
        db.refresh(ticket_to_update)
        return ticket_to_update
    except Exception as e:
        db.rollback()
        raise e
    # finally: # <<< XÓA
    #     db.close() # <<< XÓA

# <<< THÊM (db: Session)
def view_teacher_performance(db: Session, user_id: int):
    # db = SessionLocal() # <<< XÓA
    
    lecturer_info = db.query(
        Lecturer, 
        User.name
    ).join(
        User, Lecturer.user_id == User.user_id
    ).filter(
        Lecturer.user_id == user_id
    ).first()

    if not lecturer_info:
        raise HTTPException(status_code=fastapi_status.HTTP_404_NOT_FOUND, detail="Lecturer not found for the given user ID")
    
    lecturer = lecturer_info[0]
    lecturer_name = lecturer_info[1]

    attendance_stats = db.query(
        LecturersAttendance.status, 
        func.count(LecturersAttendance.status).label("count")
    ).filter(
        LecturersAttendance.lecturer_id == lecturer.lecturer_id
    ).group_by(
        LecturersAttendance.status
    ).all()
    
    teaching_attendance = {"present_days": 0, "absent_days": 0, "late_days": 0}
    for stat in attendance_stats:
        # Giả định status là Enum
        if stat.status == LecturerAttendanceStatus.present:
            teaching_attendance["present_days"] = stat.count
        elif stat.status == LecturerAttendanceStatus.absent:
            teaching_attendance["absent_days"] = stat.count
        elif stat.status == LecturerAttendanceStatus.late:
            teaching_attendance["late_days"] = stat.count

    active_classes_count = db.query(Class).filter(
        Class.lecturer_id == lecturer.lecturer_id,
        Class.status == 'active'
    ).count()
    
    archived_classes_count = db.query(Class).filter(
        Class.lecturer_id == lecturer.lecturer_id,
        Class.status == 'archived'
    ).count()

    average_grade = db.query(
        func.avg(Grade.grade)
    ).join(
        ClassAssignment, Grade.assignment_id == ClassAssignment.assignment_id
    ).join(
        Class, ClassAssignment.class_id == Class.class_id
    ).filter(
        Class.lecturer_id == lecturer.lecturer_id
    ).scalar() 

    performance_report = {
        "lecturer_id": lecturer.lecturer_id,
        "lecturer_name": lecturer_name,
        "teaching_attendance": teaching_attendance,
        "class_overview": {
            "active_classes": active_classes_count,
            "archived_classes": archived_classes_count
        },
        "student_performance": {
            "average_grade_all_classes": round(average_grade, 2) if average_grade else 0.0
        }
    }
    # db.close() # <<< XÓA
    return performance_report
    
# <<< THÊM (db: Session)
def get_unassigned_classes(db: Session):
    # db = SessionLocal() # <<< XÓA
    unassigned_classes = db.query(Class).filter(
        Class.lecturer_id == None,
        Class.status.in_(['active', 'pending']) 
    ).all()
    # db.close() # <<< XÓA
    return unassigned_classes


# <<< THÊM (db: Session)
def assign_teacher_to_class(
    db: Session,
    user_id: int, # ID của giảng viên (trong bảng Users)
    class_id: int
):
    # db = SessionLocal() # <<< XÓA
    try:
        lecturer = db.query(Lecturer).filter(Lecturer.user_id == user_id).first()
        if not lecturer:
            raise HTTPException(status_code=fastapi_status.HTTP_404_NOT_FOUND, detail=f"Lecturer not found for the given user ID {user_id}.")

        class_to_assign = db.query(Class).filter(Class.class_id == class_id).first()
        if not class_to_assign:
            raise HTTPException(status_code=fastapi_status.HTTP_404_NOT_FOUND, detail=f"Class with ID {class_id} not found.")

        if class_to_assign.lecturer_id is not None:
            raise HTTPException(status_code=fastapi_status.HTTP_409_CONFLICT, detail=f"Class is already assigned to lecturer ID {class_to_assign.lecturer_id}.")

        is_conflict = check_lecturer_schedule_conflict(
            db, # <<< TRUYỀN db
            lecturer_id=lecturer.lecturer_id,
            new_start_time=class_to_assign.schedule, 
        )

        if is_conflict:
            raise HTTPException(status_code=fastapi_status.HTTP_409_CONFLICT, detail=f"Lecturer schedule conflict. The lecturer is already busy at this time.")

        class_to_assign.lecturer_id = lecturer.lecturer_id
        db.commit()
        db.refresh(class_to_assign)
        return class_to_assign
    except Exception as e:
        db.rollback()
        raise e
    # finally: # <<< XÓA
    #     db.close() # <<< XÓA

# <<< THÊM (db: Session)
def get_class_assignment_requests(db: Session):
    # db = SessionLocal() # <<< XÓA
    requests = db.query(
        Ticket,
        User.name
    ).join(
        User, Ticket.submitted_by == User.user_id
    ).filter(
        Ticket.issue_type == 'Class Request',
        Ticket.status == 'open' # Giả định status là string
    ).all()
    
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
    # db.close() # <<< XÓA
    return result_list

# Hàm helper, không cần sửa
def _parse_class_id_from_ticket(title: str) -> Optional[int]:
    """Trích xuất Class ID từ chuỗi tiêu đề (ví dụ: '... Class ID: 7')."""
    match = re.search(r"Class ID: (\d+)", title)
    if match:
        try:
            return int(match.group(1))
        except ValueError:
            return None
    return None

# <<< THÊM (db: Session)
def approve_class_assignment_request(
    db: Session,
    ticket_id: int
):
    try:
        ticket = db.query(Ticket).filter(Ticket.ticket_id == ticket_id).first()
        if not ticket:
            raise HTTPException(status_code=fastapi_status.HTTP_404_NOT_FOUND, detail=f"Ticket with ID {ticket_id} not found.")

        if ticket.issue_type != 'Class Request':
            raise HTTPException(status_code=fastapi_status.HTTP_400_BAD_REQUEST, detail="This is not a class assignment ticket.")

        # Giả định status là string
        if ticket.status != 'open':
            raise HTTPException(status_code=fastapi_status.HTTP_409_CONFLICT, detail=f"Ticket is already '{ticket.status}', not 'open'.")

        lecturer_user_id = ticket.submitted_by
        class_id = _parse_class_id_from_ticket(ticket.title)

        if not class_id:
            raise HTTPException(status_code=fastapi_status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Could not parse class_id from ticket title: {ticket.title}")

        lecturer = db.query(Lecturer).filter(Lecturer.user_id == lecturer_user_id).first()
        if not lecturer:
            raise HTTPException(status_code=fastapi_status.HTTP_404_NOT_FOUND, detail=f"Requesting lecturer (user_id: {lecturer_user_id}) not found in Lecturers table.")

        class_to_assign = db.query(Class).filter(Class.class_id == class_id).first()
        if not class_to_assign:
            raise HTTPException(status_code=fastapi_status.HTTP_404_NOT_FOUND, detail=f"Class with ID {class_id} (from ticket) not found.")

        if class_to_assign.lecturer_id is not None:
            raise HTTPException(status_code=fastapi_status.HTTP_409_CONFLICT, detail=f"Class (ID: {class_id}) is no longer unassigned.")

        # Giả định bạn có hàm check_lecturer_schedule_conflict
        is_conflict = check_lecturer_schedule_conflict(
            db, # <<< TRUYỀN db
            lecturer_id=lecturer.lecturer_id,
            new_start_time=class_to_assign.schedule,
        )

        if is_conflict:
            raise HTTPException(status_code=fastapi_status.HTTP_409_CONFLICT, detail=f"Lecturer schedule conflict.")

        # --- Mọi thứ hợp lệ -> Thực hiện các hành động ---

        # Hành động 1: Gán giảng viên vào lớp
        class_to_assign.lecturer_id = lecturer.lecturer_id

        # <<< HÀNH ĐỘNG 2: CẬP NHẬT TRẠNG THÁI LỚP HỌC >>>
        class_to_assign.status = 'active' # Chuyển lớp thành 'active'
    
        # Hành động 3: Đóng ticket
        ticket.status = 'resolved' # Giả định status là string
        ticket.resolved_at = datetime.now()

        # Commit tất cả thay đổi
        db.commit()

        # <<< CẬP NHẬT THÔNG BÁO TRẢ VỀ >>>
        return {"message": f"Successfully approved request. Lecturer (ID: {lecturer.lecturer_id}) assigned to class (ID: {class_id}). Class status set to 'active'. Ticket (ID: {ticket_id}) resolved."}

    except Exception as e:
        db.rollback()
        # Nên ghi log lỗi ở đây để debug
        print(f"Error approving class assignment request: {e}")
        raise HTTPException(status_code=fastapi_status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"An error occurred: {e}")

# <<< THÊM (db: Session)
def take_lecturer_attendance(
    db: Session,
    lecturer_id: int,
    class_id: int,
    attendance_status: str, # Giả định là string 'present', 'absent', 'late'
    notes: Optional[str] = None
):
    # db = SessionLocal() # <<< XÓA
    try:
        today = datetime.today() # Dùng date thay vì datetime

        # Giả định LecturerAttendanceStatus là Enum có .value
        valid_statuses = [s.value for s in LecturerAttendanceStatus]
        if attendance_status not in valid_statuses:
            raise HTTPException(status_code=fastapi_status.HTTP_400_BAD_REQUEST, detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}")

        lecturer = db.query(Lecturer).filter(Lecturer.lecturer_id == lecturer_id).first()
        if not lecturer:
            raise HTTPException(status_code=fastapi_status.HTTP_404_NOT_FOUND, detail=f"Lecturer with ID {lecturer_id} not found.")

        class_to_attend = db.query(Class).filter(Class.class_id == class_id).first()
        if not class_to_attend:
            raise HTTPException(status_code=fastapi_status.HTTP_404_NOT_FOUND, detail=f"Class with ID {class_id} not found.")

        if class_to_attend.lecturer_id != lecturer.lecturer_id:
            raise HTTPException(status_code=fastapi_status.HTTP_403_FORBIDDEN, detail=f"Lecturer (ID: {lecturer_id}) is not assigned to this class.")

        existing_record = db.query(LecturersAttendance).filter(
            LecturersAttendance.lecturer_id == lecturer_id,
            LecturersAttendance.class_id == class_id,
            LecturersAttendance.attendance_date == today 
        ).first()

        if existing_record:
            raise HTTPException(status_code=fastapi_status.HTTP_409_CONFLICT, detail=f"Attendance already taken for this lecturer/class on {today}.")

        new_attendance_record = LecturersAttendance(
            lecturer_id=lecturer_id,
            class_id=class_id,
            attendance_date=today, 
            status=attendance_status, # Gán string trực tiếp
            notes=notes
        )
        
        db.add(new_attendance_record)
        db.commit()
        db.refresh(new_attendance_record)
        return new_attendance_record
    except Exception as e:
        db.rollback()
        raise e
    # finally: # <<< XÓA
    #     db.close() # <<< XÓA

def get_lecturer_list(db: Session) -> List[Dict]:
    """
    [Dành cho Coordinator] Lấy danh sách toàn bộ giảng viên trong hệ thống.
    """
    try:
        # Query Lecturers and join User to get name/email
        lecturers_info = (
            db.query(Lecturer, User)
            .join(User, Lecturer.user_id == User.user_id)
            .all()
        )

        result = []
        for lecturer, user in lecturers_info:
            result.append({
                "lecturer_id": lecturer.lecturer_id,
                "user_id": lecturer.user_id,
                "name": user.name,
                "email": user.email,
                # Add other relevant fields from Lecturer or User if needed
                # e.g., "specialization": lecturer.specialization
                "user_status": user.status.value if user.status else None
            })
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi lấy danh sách giảng viên: {e}")
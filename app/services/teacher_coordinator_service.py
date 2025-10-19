from fastapi import HTTPException, status as fastapi_status
from app.models.class_ import Class
from app.models.grade import Grade
from app.models.attendance import Attendance, AttendanceStatus
from app.models.lecturer import Lecturer
from app.models.student import Student
from app.models.ticket import Ticket
from app.models.class_assignment import ClassAssignment
from app.models.user import User
from app.db.database import SessionLocal
from datetime import datetime, timedelta
from typing import Optional

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
from fastapi import HTTPException, status as fastapi_status
from app.models.class_ import Class
from app.models.grade import Grade
from app.models.attendance import Attendance, AttendanceStatus
from app.models.lecturer import Lecturer
from app.models.student import Student
from app.models.ticket import Ticket
from app.models.class_assignment import ClassAssignment
from app.db.database import SessionLocal
from datetime import date

# == Thời khoá biểu
def get_view_schedule_of_lecturer(user_id: int):
    db = SessionLocal()
    """
    Lấy lịch dạy của một giảng viên dựa trên user_id của họ.

    Args:
        user_id (int): ID của người dùng trong bảng USERS.
        db (Session): Phiên làm việc với cơ sở dữ liệu.

    Returns:
        list: Danh sách các lớp học mà giảng viên đang dạy.
    """
    lecturer = db.query(Lecturer).filter(Lecturer.user_id == user_id).first()

    if not lecturer:
        raise HTTPException(status_code=404, detail="Lecturer not found for the given user ID")
    
    classes_taught = db.query(Class).filter(Class.lecturer_id == lecturer.lecturer_id).all()

    schedule_list = [
        {
            "class_id": cls.class_id,
            "class_name": cls.class_name,
            "schedule": cls.schedule
        }
        for cls in classes_taught if cls.status.name == 'active'
    ]

    return schedule_list

# == Thời khoá biểu
def get_view_no_lecturer_schedule():
    db = SessionLocal()   
    classes_taught = db.query(Class).filter(Class.status == 'pending').all()

    schedule_list = [
        {
            "class_id": cls.class_id,
            "class_name": cls.class_name,
            "schedule": cls.schedule
        }
        for cls in classes_taught
    ]

    return schedule_list

def get_workinghour(user_id: int):
    db = SessionLocal()
    """
    Lấy tổng số giờ làm việc của một giảng viên dựa trên user_id của họ.

    Args:
        user_id (int): ID của người dùng trong bảng USERS.
        db (Session): Phiên làm việc với cơ sở dữ liệu.
    """
    lecturer = db.query(Lecturer).filter(Lecturer.user_id == user_id).first()

    if not lecturer:
        raise HTTPException(
            status_code=404, 
            detail="Lecturer not found for the given user ID"
        )
    
    return {"total_hours": lecturer.total_hours}


def register_for_class(user_id: int,class_id: int):

    db = SessionLocal()
    lecturer = db.query(Lecturer).filter(Lecturer.user_id == user_id).first()
    if not lecturer:
        raise HTTPException(
            status_code=404,
            detail="Lecturer not found."
        )

    class_to_request = db.query(Class).filter(Class.class_id == class_id).first()
    if not class_to_request:
        raise HTTPException(
            status_code=404,
            detail="Class not found."
        )

    if class_to_request.lecturer_id is not None:
        raise HTTPException(
            status_code=409,
            detail="This class is already assigned to a lecturer."
        )
        
    existing_ticket = db.query(Ticket).filter(
        Ticket.submitted_by == user_id,
        Ticket.title == f"Class Assignment Request for Class ID: {class_id}",
        Ticket.status.in_(['open', 'in_progress'])
    ).first()

    if existing_ticket:
        raise HTTPException(
            status_code=409,
            detail="You have already submitted an open request for this class."
        )


    new_ticket = Ticket(
        submitted_by=user_id,
        assigned_to=1,
        issue_type='Class Request',
        title=f"Class Assignment Request for Class ID: {class_id}",
        description=(
            f"Lecturer with user_id {user_id} has requested to be assigned "
            f"to class '{class_to_request.class_name}' (ID: {class_id})."
        ),
        status='open'
    )

    db.add(new_ticket)
    db.commit()
    db.refresh(new_ticket)

    return {"message": "Your request to be assigned to the class has been submitted successfully."}

def take_attendence(user_id: int,class_id: int, student_id: int, status: str):

    db = SessionLocal()
    # 1. Xác thực người dùng là giảng viên của lớp này.
    lecturer = db.query(Lecturer).filter(Lecturer.user_id == user_id).first()
    if not lecturer:
        raise HTTPException(status_code=404, detail="Lecturer not found.")

    class_to_check = db.query(Class).filter(Class.class_id == class_id).first()
    if not class_to_check:
        raise HTTPException(status_code=404, detail="Class not found.")

    if class_to_check.lecturer_id != lecturer.lecturer_id:
        raise HTTPException(
            status_code=403,
            detail="You are not the lecturer of this class."
        )

    # 2. Tìm bản ghi ghi danh (assignment) tương ứng.
    assignment = db.query(ClassAssignment).filter(
        ClassAssignment.class_id == class_id,
        ClassAssignment.student_id == student_id
    ).first()

    if not assignment:
        raise HTTPException(
            status_code=404,
            detail="Student is not enrolled in this class."
        )

    valid_statuses = ['present', 'absent', 'late']
    if status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid attendance status. Must be one of: {', '.join(valid_statuses)}"
        )
    
    # today = date.today()
    # existing_record = db.query(Attendance).filter(
    #     Attendance.assignment_id == assignment.assignment_id,
    #     Attendance.date == today
    # ).first()

    # if existing_record:
    #     raise HTTPException(
    #         status_code=fastapi_status.HTTP_409_CONFLICT,
    #         detail="Attendance has already been taken for this student today. You can update it instead."
    #     )

    new_attendance = Attendance(
        assignment_id=assignment.assignment_id,
        date=date.today(),
        status=status
    )
    
    db.add(new_attendance)
    db.commit()
    db.refresh(new_attendance)

    return {"message": "Attendance taken successfully."}
    
def enter_grades(user_id: int, class_id: int, student_id: int, grade_value: float, grade_type: str,remarks: str = None):
    db = SessionLocal()
    # 1. Xác thực người dùng là giảng viên của lớp học này.
    lecturer = db.query(Lecturer).filter(Lecturer.user_id == user_id).first()
    if not lecturer:
        raise HTTPException(status_code=fastapi_status.HTTP_404_NOT_FOUND, detail="Lecturer not found.")

    class_to_grade = db.query(Class).filter(Class.class_id == class_id).first()
    if not class_to_grade:
        raise HTTPException(status_code=fastapi_status.HTTP_404_NOT_FOUND, detail="Class not found.")

    if class_to_grade.lecturer_id != lecturer.lecturer_id:
        raise HTTPException(
            status_code=fastapi_status.HTTP_403_FORBIDDEN,
            detail="You are not the lecturer of this class."
        )

    # 2. Tìm bản ghi ghi danh (assignment) để lấy assignment_id.
    assignment = db.query(ClassAssignment).filter(
        ClassAssignment.class_id == class_id,
        ClassAssignment.student_id == student_id
    ).first()

    if not assignment:
        raise HTTPException(
            status_code=fastapi_status.HTTP_404_NOT_FOUND,
            detail="Student is not enrolled in this class."
        )

    # 3. Xác thực dữ liệu điểm
    if not (0 <= grade_value <= 10):
        raise HTTPException(
            status_code=fastapi_status.HTTP_400_BAD_REQUEST,
            detail="Grade value must be between 0 and 10."
        )
    if grade_type not in ['process', 'project']:
        raise HTTPException(
            status_code=fastapi_status.HTTP_400_BAD_REQUEST,
            detail="Invalid grade type. Must be 'process' or 'project'."
        )
    
    # 4. Tìm điểm đã tồn tại.
    existing_grade = db.query(Grade).filter(
        Grade.assignment_id == assignment.assignment_id,
        Grade.grade_type == grade_type
    ).first()
    
    # ❗️ SỬA ĐỔI: Logic "UPSERT"
    if existing_grade:
        # Nếu điểm đã tồn tại -> CẬP NHẬT
        existing_grade.grade = grade_value
        if remarks is not None:
            existing_grade.remarks = remarks
        message = "Grade updated successfully."
    else:
        # Nếu điểm chưa tồn tại -> TẠO MỚI
        new_grade = Grade(
            assignment_id=assignment.assignment_id,
            grade=grade_value,
            grade_type=grade_type,
            remarks=remarks
        )
        db.add(new_grade)
        message = "Grade entered successfully."
    
    # 5. Lưu thay đổi vào database (cho cả trường hợp tạo mới và cập nhật)
    db.commit()

    return {"message": message}

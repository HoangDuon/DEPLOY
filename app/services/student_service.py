from fastapi import HTTPException
from sqlalchemy.orm import Session  # <<< THÊM VÀO
from app.models.class_ import Class
from app.models.grade import Grade
from app.models.attendance import Attendance, AttendanceStatus
from app.models.student import Student
from app.models.lecturer import Lecturer
from app.models.user import User
from app.models.class_assignment import ClassAssignment
# from app.db.database import SessionLocal # <<< XÓA ĐI

# == Thời khoá biểu
# <<< THÊM (db: Session)
def get_view_schedule_of_student(db: Session, user_id: int):
    # try: # <<< XÓA
    #     db = SessionLocal() # <<< XÓA

    student = db.query(Student).filter(Student.user_id == user_id).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    schedule_list = []
    # Tối ưu: Dùng eager loading để giảm số lượng query
    for assignment in student.assignments:
        class_ = db.query(Class).filter(Class.class_id == assignment.class_id).first()
        if class_:
            lecturer = db.query(Lecturer).filter(Lecturer.lecturer_id == class_.lecturer_id).first()
            if lecturer:
                user = db.query(User).filter(User.user_id == lecturer.user_id).first()
                schedule_list.append({
                    "class_id": class_.class_id,
                    "class_name": class_.class_name,
                    "lecturer_name": user.name,
                    "place": class_.place,
                    "schedule": class_.schedule
                })

    return schedule_list
    # finally: # <<< XÓA
    #     db.close() # <<< XÓA

# == Điểm số theo lớp
# <<< THÊM (db: Session)
def get_classes_grades_of_student(db: Session, class_id: int, user_id: int):
    # try: # <<< XÓA
    #     db = SessionLocal() # <<< XÓA

    student = db.query(Student).filter(Student.user_id == user_id).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    class_assignments = db.query(ClassAssignment).filter(
        ClassAssignment.class_id == class_id,
        ClassAssignment.student_id == student.student_id
    ).all()

    if not class_assignments:
        raise HTTPException(status_code=404, detail="Class Assignment not found")

    list_grades = []

    for class_assignment in class_assignments: # Sửa lỗi chính tả
        grades = db.query(Grade).filter(Grade.assignment_id == class_assignment.assignment_id).all()

        if not grades:
            # Không nên raise lỗi ở đây, có thể lớp chưa có điểm
            continue 
        
        for grade in grades:
            list_grades.append({
                "grade_type": grade.grade_type,
                "grade": grade.grade,
                "remarks": grade.remarks
            })

    return list_grades
    # finally: # <<< XÓA
    #     db.close() # <<< XÓA

# == Điểm danh theo lớp
# <<< THÊM (db: Session)
def get_classes_attendance_of_student(db: Session, class_id: int, user_id: int):
    # try: # <<< XÓA
    #     db = SessionLocal() # <<< XÓA

    # 1️⃣ Tìm student dựa theo user_id
    student = db.query(Student).filter(Student.user_id == user_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # 2️⃣ Lấy các assignment của học viên trong lớp này
    class_assignments = db.query(ClassAssignment).filter(
        ClassAssignment.class_id == class_id,
        ClassAssignment.student_id == student.student_id
    ).all()

    if not class_assignments:
        raise HTTPException(status_code=404, detail="Class assignments not found")

    # 3️⃣ Duyệt qua từng assignment → lấy các bản ghi điểm danh
    attendance_list = []

    for class_assignment in class_assignments:
        attendances = db.query(Attendance).filter(
            Attendance.assignment_id == class_assignment.assignment_id
        ).all()

        if not attendances:
            continue  # không raise 404, chỉ bỏ qua nếu không có

        for att in attendances:
            attendance_list.append({
                "date": att.date.isoformat() if att.date else None,
                "status": att.status
            })

    # 4️⃣ Trả về danh sách điểm danh
    return attendance_list

    # finally: # <<< XÓA
    #     db.close() # <<< XÓA

# == Tổng số lớp đang học
# <<< THÊM (db: Session)
def get_total_classes_of_student(db: Session, user_id: int):
    # try: # <<< XÓA
    #     db = SessionLocal() # <<< XÓA

    student = db.query(Student).filter(Student.user_id == user_id).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    total_classes = len(student.assignments)

    return total_classes
    # finally: # <<< XÓA
    #     db.close() # <<< XÓA

# == Điểm trung bình tất cả các lớp
# <<< THÊM (db: Session)
def get_average_grade_of_student(db: Session, user_id: int):
    # try: # <<< XÓA
    #     db = SessionLocal() # <<< XÓA

    student = db.query(Student).filter(Student.user_id == user_id).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    total_grade = 0
    grade_count = 0

    for assignment in student.assignments:
        grades = db.query(Grade).filter(Grade.assignment_id == assignment.assignment_id).all()
        # Sửa: if grades is not None: -> if grades:
        if grades: 
            for grade in grades:
                # Cần kiểm tra grade có phải là số không
                if isinstance(grade.grade, (int, float)): 
                    total_grade += grade.grade
                    grade_count += 1

    if grade_count == 0:
        return 0.0

    average_grade = total_grade / grade_count

    return average_grade
    # finally: # <<< XÓA
    #     db.close() # <<< XÓA

# == Tổng số buổi vắng
# <<< THÊM (db: Session)
def get_total_absences_of_student(db: Session, user_id: int):
    # try: # <<< XÓA
    #     db = SessionLocal() # <<< XÓA

    student = db.query(Student).filter(Student.user_id == user_id).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    total_absences = 0

    for assignment in student.assignments:
        # Tối ưu: Chỉ query những buổi vắng
        absences_count = db.query(Attendance).filter(
            Attendance.assignment_id == assignment.assignment_id,
            Attendance.status == AttendanceStatus.absent
        ).count()
        total_absences += absences_count

    return total_absences
    # finally: # <<< XÓA
    #     db.close() # <<< XÓA
from fastapi import HTTPException
from app.models.class_ import Class
from app.models.grade import Grade
from app.models.attendance import Attendance, AttendanceStatus
from app.models.student import Student
from app.db.database import SessionLocal

# == Thời khoá biểu
def get_view_schedule_of_student(user_id: int):
    db = SessionLocal()

    student = db.query(Student).filter(Student.user_id == user_id).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    schedule_list = []
    for assignment in student.assignments:
        class_ = db.query(Class).filter(Class.class_id == assignment.class_id).first()
        if class_:
            schedule_list.append({
                "class_id": class_.class_id,
                "class_name": class_.class_name,
                "schedule": class_.schedule
            })

    return schedule_list

# == Điểm số theo lớp
def get_classes_grades_of_student(class_assignment_id: int):
    db = SessionLocal()
    
    grades = db.query(Grade).filter(Grade.assignment_id == class_assignment_id).all()

    if not grades:
        raise HTTPException(status_code=404, detail="Grade not found")

    list_grades = []

    for grade in grades:
        list_grades.append({
            "grade_type": grade.grade_type,
            "grade": grade.grade,
            "remarks": grade.remarks
        })

    return list_grades

# == Điểm danh theo lớp
def get_classes_attendance_of_student(class_assignment_id: int):
    db = SessionLocal()
    
    attendance = db.query(Attendance).filter(Attendance.assignment_id == class_assignment_id).first()

    if not attendance:
        raise HTTPException(status_code=404, detail="Attendance record not found")

    return {
        "date": attendance.date,
        "status": attendance.status
    }

# == Tổng số lớp đang học
def get_total_classes_of_student(user_id: int):
    db = SessionLocal()

    student = db.query(Student).filter(Student.user_id == user_id).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    total_classes = len(student.assignments)

    return total_classes

# == Điểm trung bình tất cả các lớp
def get_average_grade_of_student(user_id: int):
    db = SessionLocal()

    student = db.query(Student).filter(Student.user_id == user_id).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    total_grade = 0
    grade_count = 0

    for assignment in student.assignments:
        grades = db.query(Grade).filter(Grade.assignment_id == assignment.assignment_id).all()
        if grades is not None:
            for grade in grades:    
                total_grade += grade.grade
                grade_count += 1

    if grade_count == 0:
        return 0.0

    average_grade = total_grade / grade_count

    return average_grade

# == Tổng số buổi vắng
def get_total_absences_of_student(user_id: int):
    db = SessionLocal()

    student = db.query(Student).filter(Student.user_id == user_id).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    total_absences = 0

    for assignment in student.assignments:
        attendance = db.query(Attendance).filter(Attendance.assignment_id == assignment.assignment_id).all()
        for record in attendance:
            if record.status == AttendanceStatus.absent:
                total_absences += 1

    return total_absences

from fastapi import HTTPException
from app.models.class_ import Class
from app.models.grade import Grade
from app.models.attendance import Attendance, AttendanceStatus
from app.models.student import Student
from app.models.lecturer import Lecturer
from app.models.user import User
from app.models.class_assignment import ClassAssignment
from app.db.database import SessionLocal

# == Thời khoá biểu
def get_view_schedule_of_student(user_id: int):
    try:
        db = SessionLocal()

        student = db.query(Student).filter(Student.user_id == user_id).first()

        if not student:
            raise HTTPException(status_code=404, detail="Student not found")

        schedule_list = []
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
                        "schedule": class_.schedule
                    })

        return schedule_list
    finally:
        db.close()

# == Điểm số theo lớp
def get_classes_grades_of_student(class_id: int, user_id: int):
    try:
        db = SessionLocal()

        student = db.query(Student).filter(Student.user_id == user_id).first()

        if not student:
            raise HTTPException(status_code=404, detail="Student not found")

        class_assignments = db.query(ClassAssignment).filter(ClassAssignment.class_id == class_id, ClassAssignment.student_id == student.student_id).all()

        if not class_assignments:
            raise HTTPException(status_code=404, detail="Class Assignment not found")

        list_grades = []

        for class_assignmemt in class_assignments:
            grades = db.query(Grade).filter(Grade.assignment_id == class_assignmemt.assignment_id).all()

            if not grades:
                raise HTTPException(status_code=404, detail="Grade not found")
            
            for grade in grades:
                list_grades.append({
                    "grade_type": grade.grade_type,
                    "grade": grade.grade,
                    "remarks": grade.remarks
                })

        return list_grades
    finally:
        db.close()

# == Điểm danh theo lớp
def get_classes_attendance_of_student(class_id: int, user_id: int):
    try:
        db = SessionLocal()

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
                    # "session": att.attendance_id,  # hoặc dùng số buổi tùy bạn định nghĩa
                    "date": att.date.isoformat() if att.date else None,
                    "status": att.status
                })

        # 4️⃣ Trả về danh sách điểm danh
        return attendance_list

    finally:
        db.close()

# == Tổng số lớp đang học
def get_total_classes_of_student(user_id: int):
    try:
        db = SessionLocal()

        student = db.query(Student).filter(Student.user_id == user_id).first()

        if not student:
            raise HTTPException(status_code=404, detail="Student not found")

        total_classes = len(student.assignments)

        return total_classes
    finally:
        db.close()

# == Điểm trung bình tất cả các lớp
def get_average_grade_of_student(user_id: int):
    try:
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
    finally:
        db.close()

# == Tổng số buổi vắng
def get_total_absences_of_student(user_id: int):
    try:
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
    finally:
        db.close()
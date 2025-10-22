from fastapi import APIRouter
from app.schemas.student_schema import ClassInfo, GradeInfo, AttendanceInfo
from app.services.student_service import get_view_schedule_of_student, \
                                        get_classes_grades_of_student, \
                                        get_classes_attendance_of_student, \
                                        get_total_classes_of_student, \
                                        get_average_grade_of_student, \
                                        get_total_absences_of_student

router = APIRouter()

@router.get("/dashboard/{user_id}")
def get_student_dashboard(user_id: int):
    total_class = get_total_classes_of_student(user_id)
    avg_grade = get_average_grade_of_student(user_id)
    total_absent = get_total_absences_of_student(user_id)
    classes = get_view_schedule_of_student(user_id)

    return {
        "overview":{
            "total_class": total_class,
            "avg_grade": avg_grade,
            "total_absent": total_absent
        },
        "schedule": classes
    }


@router.get("/class", response_model=list[ClassInfo])
def get_classes_for_student(user_id: int):
    classes = get_view_schedule_of_student(user_id)

    return classes

@router.get("/class/grade", response_model= list[GradeInfo])
def get_classGrade_for_student(class_id: int, user_id: int):
    grade = get_classes_grades_of_student(class_id, user_id)

    return grade

@router.get("/class/attendance", response_model= list[AttendanceInfo])
def get_classAttendance_for_student(class_id: int, user_id: int):
    attendance = get_classes_attendance_of_student(class_id, user_id)

    return attendance

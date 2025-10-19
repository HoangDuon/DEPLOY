from fastapi import APIRouter
from app.schemas.lecturer_schema import ClassInfo,WorkingHourInfo
from app.services.lecture_service import get_view_schedule_of_lecturer,\
    get_workinghour,get_view_no_lecturer_schedule,\
        register_for_class, take_attendence, enter_grades
                                        

router = APIRouter()

@router.get("/class", response_model=list[ClassInfo])
def get_classes_for_lecturer(user_id: int):
    classes = get_view_schedule_of_lecturer(user_id)

    return classes

@router.get("/no_teacher_class", response_model=list[ClassInfo])
def get_classes_no_lecturer_schedule():
    classes = get_view_no_lecturer_schedule()

    return classes

@router.get("/workinghour", response_model=WorkingHourInfo)
def get_workinghour_for_lecturer(user_id: int):
    classes = get_workinghour(user_id)

    return classes

@router.post("/class_request")
def make_class_request(user_id: int,class_id: int):
    classes = register_for_class(user_id,class_id)

    return classes

@router.post("/class_attendance_request")
def class_attendance(user_id: int,class_id: int, student_id: int, status: str):
    classes = take_attendence(user_id,class_id, student_id, status)

    return classes

@router.post("/class_enter_grades")
def class_enter_grades(user_id: int, class_id: int, student_id: int, grade_value: float, grade_type: str,remarks: str = None):
    classes = enter_grades(user_id,class_id, student_id, grade_value, grade_type,remarks)

    return classes
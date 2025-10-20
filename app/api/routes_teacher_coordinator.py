from fastapi import APIRouter
from app.schemas.teacher_coordinator_schema import ClassInfo,ClassCreate
from app.services.teacher_coordinator_service import get_classes,make_class,change_class,change_status_class,\
    make_notify,view_tickets,change_status_tickets, view_teacher_performance, get_unassigned_classes,assign_teacher_to_class,\
    get_class_assignment_requests,approve_class_assignment_request, take_lecturer_attendance

from datetime import datetime
from typing import Optional
                                        

router = APIRouter()

@router.get("/all_classes", response_model=list[ClassInfo])
def get_all_classes():
    classes = get_classes()

    return classes

@router.post("/create_class")
def create_class(user_id: int, class_name: str, schedule: datetime, status: str,lecturer_id: int = None, place: str = None):
    classes = make_class(user_id, class_name, schedule, status,lecturer_id, place)

    return classes

@router.post("/update_class")
def update_class(user_id: int,class_id:int , class_name: str = None, schedule: datetime = None, status: str = None,lecturer_id: int = None, place: str = None):
    classes = change_class(user_id,class_id, class_name, schedule, status,lecturer_id, place)

    return classes

@router.post("/deactive_class")
def deactive_class(user_id: int,class_id:int):
    classes = change_status_class(user_id,class_id)

    return classes

@router.post("/new_notification")
def new_notification(user_id: int,title: str,message: str,):
    classes = make_notify(user_id,title,message)

    return classes

@router.get("/get_tickets")
def get_tickets():
    classes = view_tickets()

    return classes

@router.post("/resovle_tickets")
def resovle_tickets(ticket_id: int, status: str):
    classes = change_status_tickets(ticket_id, status)

    return classes

@router.get("/view_teacher_performances")
def view_teacher_performances(user_id: int):
    classes = view_teacher_performance(user_id)

    return classes

@router.get("/unassigned_classes")
def unassigned_classes():
    classes = get_unassigned_classes()

    return classes

@router.post("/assign_teacher")
def assign_teacher(user_id: int, class_id: int):
    result = assign_teacher_to_class(user_id, class_id)
    return result

@router.get("/class_assignment_requests")
def class_assignment_requests():
    requests = get_class_assignment_requests()
    return requests

@router.post("/approve_class_assignment_request")
def approve_class_assignment_request_endpoint(ticket_id: int):
    result = approve_class_assignment_request(ticket_id)
    return result

@router.post("/take_lecturer_attendance")
def take_lecturer_attendance_endpoint(
    lecturer_id: int,
    class_id: int,
    attendance_status: str,
    notes: Optional[str] = None
):
    result = take_lecturer_attendance(
        lecturer_id,
        class_id,
        attendance_status,
        notes
    )
    return result
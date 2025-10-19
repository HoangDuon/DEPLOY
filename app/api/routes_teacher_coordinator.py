from fastapi import APIRouter
from app.schemas.teacher_coordinator_schema import ClassInfo,ClassCreate
from app.services.teacher_coordinator_service import get_classes,make_class,change_class,change_status_class
from datetime import datetime
                                        

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
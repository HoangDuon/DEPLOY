from typing import Optional
from pydantic import BaseModel, field_serializer
from datetime import datetime

class ClassInfo(BaseModel):
    class_id: int
    class_name: str
    schedule: datetime
    lecturer_name:str
    status: str

    class Config:
        from_attributes = True

class ClassCreate(BaseModel):
    user_id: int
    class_name: str
    schedule: datetime
    status: str
    lecturer_id: Optional[int] = None
    place: Optional[str] = None

class WorkingHourInfo(BaseModel):
    total_hours : int

    class Config:
        from_attributes = True
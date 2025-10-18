from typing import Optional
from pydantic import BaseModel, field_serializer
from datetime import date

class ClassInfo(BaseModel):
    class_id: int
    class_name: str
    schedule: str

    class Config:
        from_attributes = True

class GradeInfo(BaseModel):
    grade: Optional[float] = None
    remarks: Optional[str] = None

    class Config:
        from_attributes = True

class AttendanceInfo(BaseModel):
    date: date
    status: Optional[str] = None

    class Config:
        from_attributes = True
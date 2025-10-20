from typing import List, Optional
from pydantic import BaseModel


class AccountRequest(BaseModel):
    name: str
    email: str
    password: Optional[str] = None


class AttendanceRecord(BaseModel):
    assignment_id: int
    date: str
    status: str


class PerformanceRecord(BaseModel):
    assignment_id: int
    grade: float
    grade_type: str
    remarks: Optional[str] = None


class PerformanceSummary(BaseModel):
    average: Optional[float]
    records: List[PerformanceRecord]


class FeedbackItem(BaseModel):
    ticket_id: int
    title: str
    issue_type: str
    status: str
    created_at: str


class FeedbackList(BaseModel):
    feedbacks: List[FeedbackItem]


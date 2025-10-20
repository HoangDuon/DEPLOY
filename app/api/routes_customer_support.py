from fastapi import APIRouter, HTTPException, status
from app.schemas.customer_support_schema import (
    AccountRequest,
    AttendanceRecord,
    PerformanceSummary,
    FeedbackList,
    FeedbackItem,
)
from app.services import customer_support_service

router = APIRouter(tags=["Customer Support"])

@router.post("/request_account", status_code=status.HTTP_201_CREATED)
def request_account(req: AccountRequest):
    """Create a deactivated user+student record from CS input."""
    created = customer_support_service.request_student_account(req.name, req.email, req.password)
    return {"message": "User created (deactivated)", "user": created}


@router.get("/attendance", response_model=list[AttendanceRecord])
def attendance(student_id: int):
    records = customer_support_service.get_attendance_records(student_id)
    return records


@router.get("/performance", response_model=PerformanceSummary)
def performance(student_id: int):
    summary = customer_support_service.get_performance_summary(student_id)
    return summary


@router.get("/feedback", response_model=list[FeedbackItem])
def feedback(student_id: int):
    items = customer_support_service.get_feedback_for_student(student_id)
    return items

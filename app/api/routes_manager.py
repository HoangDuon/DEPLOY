from typing import Optional

from fastapi import APIRouter, HTTPException, Response, status
from app.schemas.manager_schema import CreateUserRequest, UpdateUserRequest
from app.services import manage_account_service
from app.services import report_service

router = APIRouter(tags=["Manager"])

@router.get("/ping")
def ping():
    """Simple health endpoint for manager routes."""
    return {"message": "manager routes ok"}


@router.get("/users")
def list_users():
    return manage_account_service.list_users()


@router.get("/users/{user_id}")
def get_user(user_id: int):
    u = manage_account_service.get_user(user_id)
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    return u


@router.post("/users", status_code=status.HTTP_201_CREATED)
def create_user(req: CreateUserRequest):
    """Create a user. Returns 201 on success or raises HTTPException on failure."""
    return manage_account_service.create_user(req.name, req.email, req.password, req.role_id)


@router.put("/users/{user_id}")
def update_user(user_id: int, req: UpdateUserRequest):
    data = req.dict(exclude_none=True)
    return manage_account_service.update_user(user_id, **data)


@router.post("/users/{user_id}/deactive", status_code=status.HTTP_204_NO_CONTENT)
def change_user_status(user_id: int, mode: str = "toggle"):
    """Change user status.

    Query param `mode` can be one of: 'activate', 'deactivate', 'toggle'. Default is 'toggle'.
    Returns 204 No Content on success.
    """
    mode = (mode or "toggle").lower()
    if mode == "activate":
        manage_account_service.activate_user(user_id)
    elif mode == "deactivate":
        manage_account_service.deactivate_user(user_id)
    elif mode == "toggle":
        manage_account_service.toggle_user_status(user_id)
    else:
        raise HTTPException(status_code=400, detail="Invalid mode. Use 'activate', 'deactivate' or 'toggle'.")

    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/tickets/pending-student-requests", status_code=status.HTTP_200_OK)
def list_pending_student_requests():
    """Return open tickets requesting student accounts where the student/user is currently deactivated."""
    return manage_account_service.list_student_from_ticket()


@router.get("/reports", status_code=status.HTTP_200_OK)
def list_reports(manager_id: Optional[int] = None):
    """Return generated reports (optionally filtered by manager id)."""
    return report_service.get_reports(manager_id)


@router.get("/reports/overview", status_code=status.HTTP_200_OK)
def reports_overview(manager_id: Optional[int] = None, days: int = 30):
    """Return a small overview of key metrics for managers."""
    return report_service.generate_overview(manager_id, days)


@router.post("/tickets/approve", status_code=status.HTTP_200_OK)
def approve_tickets_and_activate_students(activate_student: bool = True):
    """Approve pending student-request tickets (pulled from `list_student_from_ticket`).

    Use query `activate_student=false` to keep students inactive while approving.
    """
    return manage_account_service.approve_student_by_ticket(None, activate_student)

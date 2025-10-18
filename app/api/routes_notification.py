from fastapi import APIRouter
from app.schemas.notification_schema import NotificationRespone
from app.services.notification_service import get_all_notifications
\
router = APIRouter()

@router.get("/notifications", response_model=list[NotificationRespone])
def get_notifications():
    notifications = get_all_notifications()

    return notifications

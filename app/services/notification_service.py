from fastapi import HTTPException
from app.models.notification import Notification
from app.db.database import SessionLocal

def get_all_notifications():
    db = SessionLocal()

    notifications = db.query(Notification).order_by(Notification.created_at.desc()).all()

    if not notifications:
        raise HTTPException(status_code=404, detail="No notifications found")

    list_of_notifications = []

    for notification in notifications:
        
        list_of_notifications.append({
            "notification_id": notification.notification_id,
            "title": notification.title,
            "message": notification.message,
            "created_at": notification.created_at
        })

    return list_of_notifications
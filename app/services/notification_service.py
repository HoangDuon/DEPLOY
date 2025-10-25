from fastapi import HTTPException
from sqlalchemy.orm import Session  # <<< THÊM VÀO
from app.models.notification import Notification
# from app.db.database import SessionLocal # <<< XÓA ĐI

# <<< THÊM (db: Session)
def get_all_notifications(db: Session):
    # db = SessionLocal() # <<< XÓA

    notifications = db.query(Notification).order_by(Notification.created_at.desc()).all()

    # Trả về mảng rỗng thay vì 404 thì tốt hơn cho API
    if not notifications:
        return []

    list_of_notifications = []

    for notification in notifications:
        
        list_of_notifications.append({
            "notification_id": notification.notification_id,
            "title": notification.title,
            "message": notification.message,
            "created_at": notification.created_at
        })

    return list_of_notifications
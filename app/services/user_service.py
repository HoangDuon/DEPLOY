import hashlib
from fastapi import HTTPException
from app.models.ticket import Ticket
from app.models.user import User
from app.db.database import SessionLocal
from app.core.config import settings
from jose import jwt
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    sha256_pw = hashlib.sha256(plain_password.encode("utf-8")).hexdigest()
    return pwd_context.verify(sha256_pw, hashed_password)

def hash_password(plain_password: str) -> str:
    sha256_pw = hashlib.sha256(plain_password.encode("utf-8")).hexdigest()
    return pwd_context.hash(sha256_pw)

def authenticate_user(username: str, password: str):
    try:
        db = SessionLocal()
        user = db.query(User).filter(User.name == username).first()

        if not user:
            raise HTTPException(status_code=401, detail="Invalid Username")

        if not verify_password(password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid Password")

        return {
            "user_id": user.user_id,
            "username": user.name,
            "password_hash": user.password_hash,
            "role": user.role.role_name if user.role else None
        }
    finally:
        db.close()

def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})

    encoded_jwt = jwt.encode(
        to_encode,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM
    )
    return encoded_jwt
def get_info_from_user_id(user_id: int):
    db = SessionLocal()

    user = db.query(User).filter(User.user_id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user

def submit_ticket(user_id: int, user_assigned: int, title: str, issue_type: str, description: str, status: str = "open", created_at: datetime = None):
    try:
        if created_at is None:
            created_at = datetime.now()

        db = SessionLocal()
        new_ticket = Ticket(
            submitted_by=user_id,
            assigned_to=user_assigned,
            title=title,
            issue_type=issue_type,
            description=description,
            status=status,
            created_at=created_at
        )
        db.add(new_ticket)
        db.commit()
        db.refresh(new_ticket)

        return new_ticket
    finally:
        db.close()
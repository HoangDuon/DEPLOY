from typing import List, Optional, Dict
from app.db.database import SessionLocal
from app.models.user import User, UserStatus
from passlib.context import CryptContext
from fastapi import HTTPException

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def list_users() -> List[Dict]:
    db = SessionLocal()
    users = db.query(User).all()
    result = []
    for u in users:
        result.append({
            "user_id": u.user_id,
            "name": u.name,
            "email": u.email,
            "role": u.role.role_name if u.role else None,
            "status": u.status.value if u.status else None,
            "created_at": u.created_at,
        })
    return result


def get_user(user_id: int) -> Optional[Dict]:
    db = SessionLocal()
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        return None
    return {
        "user_id": user.user_id,
        "name": user.name,
        "email": user.email,
        "role": user.role.role_name if user.role else None,
        "status": user.status.value if user.status else None,
        "created_at": user.created_at,
    }


def create_user(name: str, email: str, password: str, role_id: int) -> Dict:
    db = SessionLocal()
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")

    pwd_hash = hash_password(password)
    new = User(name=name, email=email, password_hash=pwd_hash, role_id=role_id)
    db.add(new)
    db.commit()
    db.refresh(new)
    return {"user_id": new.user_id, "name": new.name, "email": new.email}


def update_user(user_id: int, **fields) -> Dict:
    db = SessionLocal()
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if "password" in fields:
        user.password_hash = hash_password(fields.pop("password"))

    for k, v in fields.items():
        if hasattr(user, k):
            setattr(user, k, v)

    db.add(user)
    db.commit()
    db.refresh(user)
    return {"user_id": user.user_id, "name": user.name, "email": user.email}


def delete_user(user_id: int) -> None:
    db = SessionLocal()
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()

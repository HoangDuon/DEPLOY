from typing import List, Optional, Dict
from app.db.database import SessionLocal
from app.models.user import User, UserStatus
from app.services.security import hash_password
from fastapi import HTTPException
from app.models.ticket import Ticket, TicketStatus
from app.models.student import Student
from app.models.role import Role
import re
import secrets
from datetime import date, datetime


def list_users() -> List[Dict]:
    """Liệt kê toàn bộ người dùng trong hệ thống"""
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
    """Lấy thông tin chi tiết của người dùng theo ID"""
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
    """Tạo mới người dùng"""
    db = SessionLocal()
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email đã tồn tại")

    pwd_hash = hash_password(password)
    new = User(name=name, email=email, password_hash=pwd_hash, role_id=role_id)
    db.add(new)
    db.commit()
    db.refresh(new)
    return {"user_id": new.user_id, "name": new.name, "email": new.email}


def update_user(user_id: int, **fields) -> Dict:
    """Cập nhật thông tin người dùng (có thể đổi mật khẩu)"""
    db = SessionLocal()
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")

    if "password" in fields:
        user.password_hash = hash_password(fields.pop("password"))

    for k, v in fields.items():
        if hasattr(user, k):
            setattr(user, k, v)

    db.add(user)
    db.commit()
    db.refresh(user)
    return {"user_id": user.user_id, "name": user.name, "email": user.email}


def deactivate_user(user_id: int) -> None:
    """Đánh dấu người dùng là 'deactivated' thay vì xóa khỏi DB"""
    db = SessionLocal()
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")

    # Nếu đã bị vô hiệu hóa rồi thì bỏ qua
    if user.status == UserStatus.deactivated:
        return

    user.status = UserStatus.deactivated
    db.add(user)
    db.commit()
    db.refresh(user)


def activate_user(user_id: int) -> None:
    """Kích hoạt người dùng"""
    db = SessionLocal()
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")

    # Nếu đã active thì không cần làm gì thêm
    if user.status == UserStatus.active:
        return

    user.status = UserStatus.active
    db.add(user)
    db.commit()
    db.refresh(user)


def toggle_user_status(user_id: int) -> None:
    """Chuyển đổi trạng thái người dùng giữa Active và Deactivated"""
    db = SessionLocal()
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")

    if user.status == UserStatus.active:
        user.status = UserStatus.deactivated
    else:
        user.status = UserStatus.active

    db.add(user)
    db.commit()
    db.refresh(user)


def list_student_from_ticket() -> List[Dict]:
    """Liệt kê các ticket đang mở liên quan đến sinh viên (Student hoặc Account)
    — dùng cho việc duyệt tài khoản sinh viên mới.
    """
    db = SessionLocal()
    try:
        from app.models.user import User as _User
        from app.models.student import Student as _Student, StudentStatus as _StudentStatus

        # Lấy tất cả ticket có trạng thái 'open' và loại là 'student' hoặc 'account'
        tickets = (
            db.query(Ticket)
            .filter(Ticket.status == TicketStatus.open)
            .filter(Ticket.issue_type.ilike("%student%") | Ticket.issue_type.ilike("%account%"))
            .order_by(Ticket.created_at.asc())
            .all()
        )

        result = []
        for t in tickets:
            # Tìm người gửi ticket
            submitter = None
            if t.submitted_by:
                submitter = db.query(_User).filter(_User.user_id == t.submitted_by).first()

            # Tìm bản ghi sinh viên tương ứng
            student = None
            if submitter:
                student = db.query(_Student).filter(_Student.user_id == submitter.user_id).first()

            # Chỉ thêm vào danh sách nếu sinh viên đang inactive hoặc user đang deactivated
            if student and student.status == _StudentStatus.inactive:
                result.append({
                    "ticket_id": t.ticket_id,
                    "ticket_title": t.title,
                    "ticket_description": t.description,
                    "submitted_by": t.submitted_by,
                    "submitter_name": submitter.name if submitter else None,
                    "submitter_email": submitter.email if submitter else None,
                    "student_id": student.student_id,
                    "student_status": student.status.value,
                    "created_at": t.created_at,
                    "assigned_to": t.assigned_to,
                })
            elif submitter and submitter.status == UserStatus.deactivated:
                # Nếu không có student record nhưng user bị vô hiệu hóa thì vẫn liệt kê
                result.append({
                    "ticket_id": t.ticket_id,
                    "ticket_title": t.title,
                    "ticket_description": t.description,
                    "submitted_by": t.submitted_by,
                    "submitter_name": submitter.name if submitter else None,
                    "submitter_email": submitter.email if submitter else None,
                    "student_id": student.student_id if student else None,
                    "student_status": student.status.value if student else None,
                    "created_at": t.created_at,
                    "assigned_to": t.assigned_to,
                })

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi liệt kê ticket chờ duyệt sinh viên: {e}")
    finally:
        db.close()


def approve_student_by_ticket(tickets: Optional[List] = None, activate_student: bool = True) -> List[Dict]:
    """Duyệt ticket yêu cầu tạo hoặc kích hoạt tài khoản sinh viên.
    
    - Tự động kích hoạt user và bản ghi student (nếu có).
    - Đánh dấu ticket đã được giải quyết (resolved).
    - Trả về thông tin người dùng & sinh viên sau khi duyệt.
    """
    db = SessionLocal()
    try:
        from app.models.user import User as _User
        from app.models.student import Student as _Student, StudentStatus as _StudentStatus

        results = []
        # Nếu không truyền vào danh sách ticket → lấy từ hàm list_student_from_ticket()
        if not tickets:
            tickets = list_student_from_ticket()

        # Duyệt từng ticket
        for item in tickets:
            if isinstance(item, dict):
                tid = item.get("ticket_id")
            else:
                tid = int(item)

            ticket = db.query(Ticket).filter(Ticket.ticket_id == tid).first()
            if not ticket:
                results.append({"ticket_id": tid, "error": "Không tìm thấy ticket"})
                continue

            # Kiểm tra loại ticket
            if not ticket.issue_type or ("student" not in ticket.issue_type.lower() and "account" not in ticket.issue_type.lower()):
                results.append({"ticket_id": tid, "error": "Không phải ticket loại sinh viên hoặc tài khoản"})
                continue

            # Kiểm tra ticket đã được giao cho manager chưa
            if not ticket.assigned_to:
                results.append({"ticket_id": tid, "error": "Ticket chưa được giao cho quản lý"})
                continue
            assigned_user = db.query(_User).filter(_User.user_id == ticket.assigned_to).join(_User.role).first()
            if not assigned_user or not assigned_user.role or "manager" not in assigned_user.role.role_name.lower():
                results.append({"ticket_id": tid, "error": "Ticket chưa giao cho người có vai trò Manager"})
                continue

            # Lấy người gửi ticket
            if not ticket.submitted_by:
                results.append({"ticket_id": tid, "error": "Ticket không có người gửi"})
                continue
            submitter = db.query(_User).filter(_User.user_id == ticket.submitted_by).first()
            if not submitter:
                results.append({"ticket_id": tid, "error": "Không tìm thấy người gửi"})
                continue

            # Tạo bản ghi Student nếu chưa có
            student = db.query(_Student).filter(_Student.user_id == submitter.user_id).first()
            enroll_date = date.today()
            if not student:
                student = _Student(
                    user_id=submitter.user_id,
                    enrollment_date=enroll_date,
                    status=_StudentStatus.active if activate_student else _StudentStatus.inactive
                )
                db.add(student)
            else:
                if activate_student:
                    student.status = _StudentStatus.active

            # Kích hoạt user
            submitter.status = UserStatus.active

            # Đánh dấu ticket đã xử lý
            ticket.status = TicketStatus.resolved
            ticket.resolved_at = datetime.utcnow()

            db.add(submitter)
            db.add(student)
            db.add(ticket)

            # Commit từng ticket riêng biệt để tránh lỗi hàng loạt
            try:
                db.commit()
            except Exception as e:
                db.rollback()
                results.append({"ticket_id": tid, "error": f"Lỗi khi commit vào DB: {e}"})
                continue

            db.refresh(submitter)
            db.refresh(student)

            results.append({
                "ticket_id": tid,
                "user_id": submitter.user_id,
                "name": submitter.name,
                "email": submitter.email,
                "student_id": student.student_id,
                "student_status": student.status.value,
            })

        return results
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi khi duyệt sinh viên: {e}")
    finally:
        db.close()

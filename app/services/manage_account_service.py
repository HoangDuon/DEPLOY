from typing import List, Optional, Dict
from sqlalchemy.orm import Session  # <<< THAY ĐỔI: Import Session
# from app.db.database import SessionLocal  # <<< THAY ĐỔI: Xóa import này
from app.models.user import User, UserStatus
from app.services.security import hash_password
from fastapi import HTTPException
from app.models.ticket import Ticket, TicketStatus
from app.models.student import Student, StudentStatus
from app.models.role import Role
from app.models.user import User as _User  # Tránh xung đột tên
import re
import secrets
from datetime import date, datetime
import json

# <<< THAY ĐỔI: Thêm (db: Session)
def list_users(db: Session) -> List[Dict]:
    """Liệt kê toàn bộ người dùng trong hệ thống"""
    # db = SessionLocal() # <<< THAY ĐỔI: Xóa
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
    # db.close() # <<< THAY ĐỔI: Xóa (nếu có)
    return result

# <<< THAY ĐỔI: Thêm (db: Session)
def get_user(db: Session, user_id: int) -> Optional[Dict]:
    """Lấy thông tin chi tiết của người dùng theo ID"""
    # db = SessionLocal() # <<< THAY ĐỔI: Xóa
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        # db.close() # <<< THAY ĐỔI: Xóa (nếu có)
        return None
    # db.close() # <<< THAY ĐỔI: Xóa (nếu có)
    return {
        "user_id": user.user_id,
        "name": user.name,
        "email": user.email,
        "role": user.role.role_name if user.role else None,
        "status": user.status.value if user.status else None,
        "created_at": user.created_at,
    }

# <<< THAY ĐỔI: Thêm (db: Session)
def create_user(db: Session, name: str, email: str, password: str, role_id: int) -> Dict:
    """Tạo mới người dùng"""
    # db = SessionLocal() # <<< THAY ĐỔI: Xóa
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        # db.close() # <<< THAY ĐỔI: Xóa (nếu có)
        raise HTTPException(status_code=400, detail="Email đã tồn tại")

    pwd_hash = hash_password(password)
    new = User(name=name, email=email, password_hash=pwd_hash, role_id=role_id)
    db.add(new)
    db.commit()
    db.refresh(new)
    # db.close() # <<< THAY ĐỔI: Xóa (nếu có)
    return {"user_id": new.user_id, "name": new.name, "email": new.email}

# <<< THAY ĐỔI: Thêm (db: Session)
def update_user(db: Session, user_id: int, **fields) -> Dict:
    """Cập nhật thông tin người dùng (có thể đổi mật khẩu)"""
    # db = SessionLocal() # <<< THAY ĐỔI: Xóa
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        # db.close() # <<< THAY ĐỔI: Xóa (nếu có)
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")

    if "password" in fields:
        user.password_hash = hash_password(fields.pop("password"))

    for k, v in fields.items():
        if hasattr(user, k):
            setattr(user, k, v)

    db.add(user)
    db.commit()
    db.refresh(user)
    # db.close() # <<< THAY ĐỔI: Xóa (nếu có)
    return {"user_id": user.user_id, "name": user.name, "email": user.email}

# <<< THAY ĐỔI: Thêm (db: Session)
def deactivate_user(db: Session, user_id: int) -> None:
    """Đánh dấu người dùng là 'deactivated' thay vì xóa khỏi DB"""
    # db = SessionLocal() # <<< THAY ĐỔI: Xóa
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        # db.close() # <<< THAY ĐỔI: Xóa (nếu có)
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")

    # Nếu đã bị vô hiệu hóa rồi thì bỏ qua
    if user.status == UserStatus.deactivated:
        # db.close() # <<< THAY ĐỔI: Xóa (nếu có)
        return

    user.status = UserStatus.deactivated
    db.add(user)
    db.commit()
    db.refresh(user)
    # db.close() # <<< THAY ĐỔI: Xóa (nếu có)

# <<< THAY ĐỔI: Thêm (db: Session)
def activate_user(db: Session, user_id: int) -> None:
    """Kích hoạt người dùng"""
    # db = SessionLocal() # <<< THAY ĐỔI: Xóa
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        # db.close() # <<< THAY ĐỔI: Xóa (nếu có)
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")

    # Nếu đã active thì không cần làm gì thêm
    if user.status == UserStatus.active:
        # db.close() # <<< THAY ĐỔI: Xóa (nếu có)
        return

    user.status = UserStatus.active
    db.add(user)
    db.commit()
    db.refresh(user)
    # db.close() # <<< THAY ĐỔI: Xóa (nếu có)

# <<< THAY ĐỔI: Thêm (db: Session)
def toggle_user_status(db: Session, user_id: int) -> None:
    """Chuyển đổi trạng thái người dùng giữa Active và Deactivated"""
    # db = SessionLocal() # <<< THAY ĐỔI: Xóa
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        # db.close() # <<< THAY ĐỔI: Xóa (nếu có)
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")

    if user.status == UserStatus.active:
        user.status = UserStatus.deactivated
    else:
        user.status = UserStatus.active

    db.add(user)
    db.commit()
    db.refresh(user)
    # db.close() # <<< THAY ĐỔI: Xóa (nếu có)

# <<< THAY ĐỔI: Thêm (db: Session)
def list_student_from_ticket(db: Session) -> List[Dict]:
    """
    [Dành cho Manager] Liệt kê các ticket 'Account Request' đang chờ duyệt.
    Hàm này hiển thị ai đã gửi (CS) và nội dung JSON trong description.
    """
    try:
        tickets = (
            db.query(Ticket)
            .filter(Ticket.status == TicketStatus.open)
            .filter(Ticket.issue_type == "Account Request")
            .order_by(Ticket.created_at.asc())
            .all()
        )

        result = []
        for t in tickets:
            # Tìm CS agent đã gửi
            submitter = None
            if t.submitted_by:
                submitter = db.query(_User).filter(_User.user_id == t.submitted_by).first()

            result.append({
                "ticket_id": t.ticket_id,
                "ticket_title": t.title,
                "ticket_description": t.description, 
                "submitted_by_cs_id": t.submitted_by,
                "submitter_cs_name": submitter.name if submitter else "N/A",

                "created_at": t.created_at,
                "assigned_to": t.assigned_to,
            })

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi liệt kê ticket: {e}")


def approve_student_by_ticket(db: Session, tickets_ids: List[int], activate: bool = True) -> List[Dict]:
    """
    [Dành cho Manager] Duyệt ticket 'Account Request' bằng cách đọc JSON
    từ description (ngay cả khi có văn bản ở trên).
    
    `tickets_ids`: Danh sách ID của các ticket cần duyệt.
    `activate`: Mặc định là True (kích hoạt).
    """
    results = []
    
    # 1. Lấy Role ID của "Student" một lần duy nhất
    student_role = db.query(Role).filter(Role.role_name == "Student").first()
    if not student_role:
        raise HTTPException(status_code=500, detail="Lỗi hệ thống: Không tìm thấy 'Student' Role ID.")
    
    student_role_id = student_role.role_id
    
    activation_status = UserStatus.active if activate else UserStatus.deactivated
    student_activation_status = StudentStatus.active if activate else StudentStatus.inactive

    # 2. Duyệt qua từng ticket ID mà Manager chọn
    for tid in tickets_ids:
        ticket = db.query(Ticket).filter(Ticket.ticket_id == tid).first()
        
        # 2.1. Kiểm tra ticket cơ bản
        if not ticket:
            results.append({"ticket_id": tid, "status": "error", "detail": "Không tìm thấy ticket"})
            continue
        if ticket.issue_type != "Account Request":
            results.append({"ticket_id": tid, "status": "error", "detail": "Không phải ticket 'Account Request'"})
            continue
        if ticket.status != TicketStatus.open:
            results.append({"ticket_id": tid, "status": "error", "detail": f"Ticket đã ở trạng thái {ticket.status.value}, không thể duyệt."})
            continue

        processed_students = []
        try:
            # <<< THAY ĐỔI BẮT ĐẦU TỪ ĐÂY
            # 3. Tách phần văn bản và phần JSON
            raw_description = ticket.description
            separator = "---JSON_DATA_START---" # Dấu hiệu ngăn cách
            
            json_part_index = raw_description.find(separator)
            
            json_text = ""
            if json_part_index == -1:
                # Nếu không tìm thấy dấu hiệu, thử giả định TOÀN BỘ là JSON
                # (để tương thích nếu CS chỉ dán JSON)
                json_text = raw_description
            else:
                # Nếu tìm thấy, chỉ lấy phần text BÊN DƯỚI nó
                json_text = raw_description[json_part_index + len(separator):]

            # 4. Phân tích (Parse) JSON
            # Bây giờ, parse phần json_text đã được tách ra
            student_data_list = json.loads(json_text) 
            if not isinstance(student_data_list, list):
                raise ValueError("Nội dung data (sau dấu hiệu) không phải là một danh sách (list) JSON.")
            # <<< KẾT THÚC THAY ĐỔI
                
            # 5. Duyệt qua từng sinh viên trong JSON (Logic này giữ nguyên)
            for student_info in student_data_list:
                name = student_info.get("name")
                email = student_info.get("email")
                password = student_info.get("password") 

                if not name or not email:
                    raise ValueError(f"Một mục trong JSON bị thiếu 'name' hoặc 'email'.")

                # 6. Kiểm tra User đã tồn tại chưa
                existing_user = db.query(User).filter(User.email == email).first()

                if existing_user:
                    # 6.a. NẾU USER TỒN TẠI: Kích hoạt/Cập nhật
                    existing_user.status = activation_status
                    existing_user.name = name 
                    db.add(existing_user)
                    
                    student_record = db.query(Student).filter(Student.user_id == existing_user.user_id).first()
                    if student_record:
                        student_record.status = student_activation_status
                        db.add(student_record)
                    else:
                        new_student = Student(user_id=existing_user.user_id, enrollment_date=date.today(), status=student_activation_status)
                        db.add(new_student)
                    
                    processed_students.append({"email": email, "status": "updated/activated", "user_id": existing_user.user_id})

                else:
                    # 6.b. NẾU USER CHƯA TỒN TẠI: Tạo mới
                    if not password:
                        raise ValueError(f"Thiếu 'password' cho tài khoản mới: {email}.")
                    
                    pwd_hash = hash_password(password)
                    new_user = User(
                        name=name,
                        email=email,
                        password_hash=pwd_hash,
                        role_id=student_role_id,
                        status=activation_status 
                    )
                    db.add(new_user)
                    db.flush() 

                    new_student = Student(
                        user_id=new_user.user_id,
                        enrollment_date=date.today(),
                        status=student_activation_status
                    )
                    db.add(new_student)
                    
                    processed_students.append({"email": email, "status": "created", "user_id": new_user.user_id})

            # 7. Nếu mọi thứ thành công, đóng ticket
            ticket.status = TicketStatus.resolved
            ticket.resolved_at = datetime.utcnow()
            db.add(ticket)

            # 8. Commit giao dịch CHO TICKET NÀY
            db.commit()
            results.append({"ticket_id": tid, "status": "success", "processed_details": processed_students})

        except (json.JSONDecodeError, ValueError) as e:
            db.rollback()
            results.append({"ticket_id": tid, "status": "error", "detail": f"Lỗi Dữ liệu JSON: {str(e)}"})
        except Exception as e:
            db.rollback()
            results.append({"ticket_id": tid, "status": "error", "detail": f"Lỗi Hệ thống: {str(e)}"})

    return results
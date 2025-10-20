from typing import List, Dict, Optional
from app.db.database import SessionLocal
from app.models.ticket import Ticket, TicketStatus
from app.models.attendance import Attendance
from app.models.class_assignment import ClassAssignment
from app.models.grade import Grade
from app.models.student import Student, StudentStatus
from app.models.user import User, UserStatus
import secrets
from app.services.security import hash_password, _truncate_to_72
from datetime import date, datetime
from fastapi import HTTPException
from app.models.role import Role


def request_student_account(name: str, email: str, password: Optional[str] = None) -> Dict:
    """Tạo tài khoản người dùng và sinh viên ở trạng thái **vô hiệu hóa** (dành cho bộ phận Hỗ trợ khách hàng).

    - Nếu email đã tồn tại, trả về lỗi HTTP 400.
    - Tự động tạo ticket gửi cho quản lý để phê duyệt tài khoản.
    - Trả về thông tin người dùng được tạo (user_id, name, email, status).
    """
    db = SessionLocal()
    try:
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Người dùng với email này đã tồn tại")

        # Tìm role "Student" trong bảng Role
        role = db.query(Role).filter(Role.role_name.ilike("%student%")).first()
        if not role:
            raise HTTPException(status_code=400, detail="Không tìm thấy role Student trong bảng roles")

        # Dùng mật khẩu người dùng cung cấp hoặc tự sinh
        if password:
            safe_pw = _truncate_to_72(password)
        else:
            plain_pwd = secrets.token_urlsafe(6)
            safe_pw = _truncate_to_72(plain_pwd)

        pwd_hash = hash_password(safe_pw)

        # Tạo user ở trạng thái vô hiệu hóa
        new_user = User(name=name, email=email, password_hash=pwd_hash, role_id=role.role_id, status=UserStatus.deactivated)
        db.add(new_user)
        db.flush()

        # Tạo bản ghi Student tương ứng
        enroll = date.today()
        new_student = Student(user_id=new_user.user_id, enrollment_date=enroll, status=StudentStatus.inactive)
        db.add(new_student)

        # Commit user + student trước để có user_id hợp lệ
        db.commit()
        db.refresh(new_user)
        db.refresh(new_student)

        # Tạo ticket gửi lên quản lý để phê duyệt tài khoản
        try:
            mgr_role = db.query(Role).filter(Role.role_name.ilike("%manager%")).first()
            assigned_to = None
            if mgr_role:
                mgr_user = db.query(User).filter(User.role_id == mgr_role.role_id).first()
                if mgr_user:
                    assigned_to = mgr_user.user_id

            title = f"Yêu cầu duyệt tài khoản học sinh {new_user.name}"
            description = f"Xin vui lòng xem xét và phê duyệt học sinh. Họ tên: {new_user.name}, Email: {new_user.email}."

            ticket = Ticket(
                submitted_by=new_user.user_id,
                assigned_to=assigned_to,
                title=title,
                issue_type="Account Request",
                description=description,
                status=TicketStatus.open
            )
            db.add(ticket)
            db.commit()
            db.refresh(ticket)
            ticket_id = ticket.ticket_id
        except Exception:
            # Không làm hỏng quy trình chính nếu tạo ticket thất bại
            ticket_id = None

        return {
            "user_id": new_user.user_id,
            "name": new_user.name,
            "email": new_user.email,
            "status": new_user.status.value,
            "approval_ticket_id": ticket_id
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Tạo user/student thất bại: {e}")
    finally:
        db.close()


def get_attendance_records(student_id: int) -> List[Dict]:
    """Lấy danh sách **điểm danh** của sinh viên theo student_id."""
    db = SessionLocal()

    # Tìm các lớp mà sinh viên được phân công
    assignments = db.query(ClassAssignment).filter(ClassAssignment.student_id == student_id).all()
    if not assignments:
        return []

    records = []
    for a in assignments:
        # Lấy danh sách buổi điểm danh tương ứng
        att = db.query(Attendance).filter(Attendance.assignment_id == a.assignment_id).all()
        for at in att:
            records.append({
                "assignment_id": a.assignment_id,
                "date": at.date.isoformat(),
                "status": at.status.value if hasattr(at.status, 'value') else str(at.status),
            })

    db.close()
    return records


def get_performance_summary(student_id: int) -> Dict:
    """Lấy **tổng kết điểm số** của sinh viên (bao gồm điểm trung bình và chi tiết các bài)."""
    db = SessionLocal()

    assignments = db.query(ClassAssignment).filter(ClassAssignment.student_id == student_id).all()
    if not assignments:
        return {"average": None, "records": []}

    records = []
    grades_list = []
    for a in assignments:
        g = db.query(Grade).filter(Grade.assignment_id == a.assignment_id).all()
        for gg in g:
            records.append({
                "assignment_id": a.assignment_id,
                "grade": gg.grade,
                "grade_type": gg.grade_type.name if hasattr(gg.grade_type, 'name') else str(gg.grade_type),
                "remarks": gg.remarks,
            })
            grades_list.append(gg.grade)

    avg = sum(grades_list) / len(grades_list) if grades_list else None

    db.close()
    return {"average": avg, "records": records}


def get_feedback_for_student(student_id: int) -> List[Dict]:
    """Lấy **danh sách phản hồi (feedback)** của sinh viên thông qua ticket."""
    db = SessionLocal()

    # Tìm user_id tương ứng với student_id
    student = db.query(Student).filter(Student.student_id == student_id).first()
    if not student:
        db.close()
        return []

    # Lọc các ticket có issue_type = 'Student Feedback'
    tickets = (
        db.query(Ticket)
        .filter(Ticket.submitted_by == student.user_id)
        .filter(Ticket.issue_type == "Student Feedback")
        .order_by(Ticket.created_at.desc())
        .all()
    )

    result = []
    for t in tickets:
        result.append({
            "ticket_id": t.ticket_id,
            "title": t.title,
            "issue_type": t.issue_type,
            "status": t.status.value if hasattr(t.status, 'value') else str(t.status),
            "created_at": t.created_at.isoformat() if t.created_at else None,
        })

    db.close()
    return result

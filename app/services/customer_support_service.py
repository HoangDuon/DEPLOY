import json  # <<< THÊM VÀO
from typing import List, Dict, Optional
from sqlalchemy.orm import joinedload
from sqlalchemy.orm import Session  # <<< THÊM VÀO
# from app.db.database import SessionLocal # <<< XÓA ĐI
from app.models.ticket import Ticket, TicketStatus
from app.models.attendance import Attendance
from app.models.class_assignment import ClassAssignment
from app.models.grade import Grade
from app.models.student import Student, StudentStatus
from app.models.user import User, UserStatus
from app.models.class_ import Class
import secrets
from app.services.security import hash_password, _truncate_to_72
from datetime import date, datetime
from fastapi import HTTPException
from app.models.role import Role


def get_student_list(db: Session) -> List[Dict]:
    """
    [Dành cho CS] Lấy danh sách toàn bộ sinh viên trong hệ thống.
    Bao gồm thông tin cơ bản và danh sách các lớp đang học.
    """
    try:
        # <<< THAY ĐỔI: Tối ưu query
        # Dùng joinedload để lấy User, ClassAssignment, và Class
        # chỉ trong 1 câu query.
        # Giả định: 
        # 1. Student có relationship 'user'
        # 2. Student có relationship 'assignments' (tới ClassAssignment)
        # 3. ClassAssignment có relationship 'class_' (tới Class)
        students = (
            db.query(Student)
            .options(
                joinedload(Student.user), # Tải thông tin User
                joinedload(Student.assignments) # Tải các ClassAssignment
                .joinedload(ClassAssignment.class_) # Tải thông tin Class từ ClassAssignment
            )
            .all()
        )
        # <<< KẾT THÚC THAY ĐỔI
        
        result = []
        for s in students:
            # Lấy thông tin user (tên, email) - giờ đã được tải sẵn
            user = s.user 
            if not user:
                continue # Bỏ qua nếu data bị lỗi (student không có user)

            # <<< THAY ĐỔI: Lấy danh sách lớp chi tiết
            classes_list = []
            if s.assignments: # s.assignments đã được tải sẵn
                for assignment in s.assignments:
                    # assignment.class_ cũng đã được tải sẵn
                    if assignment.class_: 
                        classes_list.append({
                            "class_id": assignment.class_.class_id,
                            "class_name": assignment.class_.class_name
                        })
            # <<< KẾT THÚC THAY ĐỔI

            result.append({
                "student_id": s.student_id,
                "user_id": s.user_id,
                "name": user.name,
                "email": user.email,
                "student_status": s.status.value if s.status else None,
                "user_status": user.status.value if user.status else None,
                
                # <<< THAY ĐỔI: Trả về cả count và list
                "class_count": len(classes_list),
                "classes": classes_list, # Danh sách lớp chi tiết
                # <<< KẾT THÚC THAY ĐỔI

                "enrollment_date": s.enrollment_date.isoformat() if s.enrollment_date else None
            })
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi lấy danh sách sinh viên: {e}")
    
# <<< HÀM NÀY ĐÃ BỊ THAY THẾ HOÀN TOÀN
def create_account_request_ticket(
    db: Session, 
    cs_user_id: int, 
    title: str, 
    description_text: str, 
    student_data: List[Dict]
) -> Dict:
    """
    [Dành cho CS] Tạo ticket 'Account Request' chứa JSON để Manager duyệt.
    Hàm này KHÔNG tạo user, chỉ tạo ticket.
    """
    try:
        # <<< BƯỚC 1: KIỂM TRA SỰ TỒN TẠI CỦA CS (USER GỬI)
        # Kiểm tra xem cs_user_id có tồn tại trong bảng Users không
        cs_user = db.query(User).filter(User.user_id == cs_user_id).first()
        if not cs_user:
            # Trả về lỗi 404 nếu không tìm thấy User (CS)
            raise HTTPException(status_code=404, detail=f"Không tìm thấy người dùng (CS) với ID: {cs_user_id}")
        # <<< KẾT THÚC BƯỚC 1

        # 2. Tìm Manager để gán ticket
        mgr_role = db.query(Role).filter(Role.role_name.ilike("%manager%")).first()
        assigned_to = None
        if mgr_role:
            mgr_user = db.query(User).filter(User.role_id == mgr_role.role_id).first()
            if mgr_user:
                assigned_to = mgr_user.user_id

        # 3. Chuyển đổi dữ liệu student thành chuỗi JSON
        try:
            json_string = json.dumps(student_data, indent=2, ensure_ascii=False)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Dữ liệu sinh viên (student_data) không hợp lệ: {e}")

        # 4. Tạo nội dung description (Văn bản + Dấu hiệu + JSON)
        full_description = f"{description_text}\n\n---JSON_DATA_START---\n{json_string}"

        # 5. Tạo ticket
        ticket = Ticket(
            submitted_by=cs_user_id,  # <<< ID này giờ đã được xác thực
            assigned_to=assigned_to,
            title=title,
            issue_type="Account Request", # <<< Đúng loại ticket
            description=full_description, # <<< Nội dung JSON
            status=TicketStatus.open
        )
        db.add(ticket)
        db.commit()
        db.refresh(ticket)
        
        return {
            "message": "Đã tạo ticket yêu cầu thành công.",
            "ticket_id": ticket.ticket_id,
            "submitted_by_cs_id": cs_user_id,
            "assigned_to_manager_id": assigned_to,
            "issue_type": ticket.issue_type,
            "status": ticket.status.value
        }
        
    except HTTPException:
        # Nếu là lỗi 404/400 (do chúng ta ném ra), chỉ cần ném lại
        raise
    except Exception as e:
        # Các lỗi khác (như lỗi DB)
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Tạo ticket thất bại: {e}")

# --- CÁC HÀM KHÁC ĐƯỢC REFACTOR ĐỂ NHẬN db: Session ---

# <<< THÊM (db: Session)
def get_attendance_records(db: Session, student_id: int) -> List[Dict]:
    """Lấy danh sách **điểm danh** của sinh viên theo student_id."""
    # db = SessionLocal() # <<< XÓA

    assignments = db.query(ClassAssignment).filter(ClassAssignment.student_id == student_id).all()
    if not assignments:
        return []

    records = []
    for a in assignments:
        att = db.query(Attendance).filter(Attendance.assignment_id == a.assignment_id).all()
        for at in att:
            records.append({
                "assignment_id": a.assignment_id,
                "date": at.date.isoformat(),
                "status": at.status.value if hasattr(at.status, 'value') else str(at.status),
            })

    # db.close() # <<< XÓA
    return records

# <<< THÊM (db: Session)
def get_performance_summary(db: Session, student_id: int) -> Dict:
    """Lấy **tổng kết điểm số** của sinh viên (bao gồm điểm trung bình và chi tiết các bài)."""
    # db = SessionLocal() # <<< XÓA

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
            if isinstance(gg.grade, (int, float)):
                grades_list.append(gg.grade)

    avg = sum(grades_list) / len(grades_list) if grades_list else None

    # db.close() # <<< XÓA
    return {"average": avg, "records": records}

# <<< THÊM (db: Session)
def get_feedback_for_student(db: Session, student_id: int) -> List[Dict]:
    """Lấy **danh sách phản hồi (feedback)** của sinh viên thông qua ticket."""
    # db = SessionLocal() # <<< XÓA

    student = db.query(Student).filter(Student.student_id == student_id).first()
    if not student:
        # db.close() # <<< XÓA
        return []

    tickets = (
        db.query(Ticket)
        .filter(Ticket.submitted_by == student.user_id)
        .filter(Ticket.issue_type == "Student Feedback") # Giữ lại logic này cho feedback
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

    # db.close() # <<< XÓA
    return result

def get_all_student_feedback(db: Session) -> List[Dict]:
    """
    [Dành cho CS] Lấy danh sách TOÀN BỘ phản hồi (feedback) từ tất cả học viên.
    """
    try:
        # Tối ưu: Query Ticket và join User để lấy tên người gửi
        feedbacks = (
            db.query(Ticket, User)
            .join(User, Ticket.submitted_by == User.user_id)
            .filter(Ticket.issue_type == "Student Feedback") # Chỉ lấy ticket loại Feedback
            .order_by(Ticket.created_at.desc())
            .all()
        )

        result = []
        for t, u in feedbacks: # t là Ticket, u là User (sinh viên gửi)
            result.append({
                "ticket_id": t.ticket_id,
                "title": t.title,
                "issue_type": t.issue_type,
                "status": t.status.value if hasattr(t.status, 'value') else str(t.status),
                "created_at": t.created_at.isoformat() if t.created_at else None,
                
                # Thông tin sinh viên đã gửi
                "submitted_by_user_id": t.submitted_by,
                "student_name": u.name if u else "N/A",
                "student_email": u.email if u else "N/A"
            })
        
        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi lấy danh sách feedback: {e}")
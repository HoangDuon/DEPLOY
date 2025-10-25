from fastapi import APIRouter, Depends, HTTPException, status # <<< THÊM VÀO
from sqlalchemy.orm import Session # <<< THÊM VÀO
from app.db.database import get_db # <<< THÊM VÀO
from typing import List, Optional # <<< THÊM VÀO
from datetime import datetime

# Import Schemas (Giả định bạn có các schema này)
from app.schemas.teacher_coordinator_schema import (
    ClassInfo,
    ClassCreate,
    ClassUpdate,
    NotificationCreate,
    TicketInfo,
    TicketStatusUpdate,
    TeacherPerformance,
    UnassignedClassInfo,
    AssignTeacherRequest,
    ClassAssignmentRequestInfo,
    LecturerAttendanceRequest,
    LecturerInfo
)

# Import Services
from app.services.teacher_coordinator_service import (
    get_classes,
    make_class,
    change_class,
    change_status_class,
    make_notify,
    view_tickets,
    change_status_tickets,
    view_teacher_performance,
    get_unassigned_classes,
    assign_teacher_to_class,
    get_class_assignment_requests,
    approve_class_assignment_request,
    take_lecturer_attendance,
    get_lecturer_list
)

router = APIRouter(tags=["Teacher Coordinator"]) # <<< Đặt tag cho rõ ràng

@router.get("/classes/all", response_model=List[ClassInfo]) # <<< Sửa route cho rõ hơn
# <<< THÊM (db: Session = Depends(get_db))
def get_all_classes(db: Session = Depends(get_db)):
    # <<< TRUYỀN `db`
    classes = get_classes(db)
    return classes

@router.post("/classes/create", response_model=ClassInfo) # <<< Sửa route và response_model
# <<< THÊM (db: Session = Depends(get_db))
# <<< Sử dụng Pydantic Model cho Request Body
def create_class(
    req: ClassCreate, # Sử dụng schema thay vì nhiều tham số
    db: Session = Depends(get_db),
    # user_id có thể lấy từ token sau này
    current_user_id: int = 1 # Tạm thời hardcode ID người tạo
):
    # <<< TRUYỀN `db` và các tham số từ `req`
    new_class = make_class(
        db,
        user_id=current_user_id,
        class_name=req.class_name,
        schedule=req.schedule,
        status=req.status,
        lecturer_id=req.lecturer_id,
        place=req.place
    )
    # Cần format lại response cho khớp ClassInfo
    # (Hàm make_class đã trả về Class object, Pydantic sẽ tự xử lý nếu schema đúng)
    # Tạm thời trả về object trực tiếp
    return new_class


@router.put("/classes/{class_id}/update", response_model=ClassInfo) # <<< Sửa route, dùng PUT và path param
# <<< THÊM (db: Session = Depends(get_db))
# <<< Sử dụng Pydantic Model cho Request Body
def update_class(
    class_id: int,
    req: ClassUpdate, # Sử dụng schema update (chứa các trường Optional)
    db: Session = Depends(get_db),
    # user_id có thể lấy từ token
    current_user_id: int = 1 # Tạm thời hardcode
):
    # <<< TRUYỀN `db` và các tham số
    updated_class = change_class(
        db,
        user_id=current_user_id,
        class_id=class_id,
        class_name=req.class_name,
        schedule=req.schedule,
        status=req.status,
        lecturer_id=req.lecturer_id,
        place=req.place
    )
    return updated_class

@router.get("/teachers/all", response_model=List[LecturerInfo])
def get_all_lecturers(db: Session = Depends(get_db)):
    """
    [Coordinator] Lấy danh sách toàn bộ giảng viên.
    """
    lecturers = get_lecturer_list(db) # Call the new service function
    return lecturers

@router.post("/classes/{class_id}/toggle-status") # <<< Sửa route, dùng POST và path param
# <<< THÊM (db: Session = Depends(get_db))
def toggle_class_status( # <<< Đổi tên hàm cho rõ
    class_id: int,
    db: Session = Depends(get_db),
    # user_id có thể lấy từ token
    current_user_id: int = 1 # Tạm thời hardcode
):
    # <<< TRUYỀN `db`
    result = change_status_class(db, current_user_id, class_id)
    return result

@router.post("/notifications/create") # <<< Sửa route
# <<< THÊM (db: Session = Depends(get_db))
# <<< Sử dụng Pydantic Model
def create_notification( # <<< Đổi tên hàm
    req: NotificationCreate,
    db: Session = Depends(get_db),
    # user_id có thể lấy từ token
    current_user_id: int = 1 # Tạm thời hardcode
):
    # <<< TRUYỀN `db`
    notification = make_notify(
        db,
        user_id=current_user_id,
        title=req.title,
        message=req.message
    )
    return notification # Trả về notification object

@router.get("/tickets/all", response_model=List[TicketInfo]) # <<< Sửa route và response_model
# <<< THÊM (db: Session = Depends(get_db))
def get_all_tickets(db: Session = Depends(get_db)): # <<< Đổi tên hàm
    # <<< TRUYỀN `db`
    tickets = view_tickets(db)
    return tickets

@router.put("/tickets/{ticket_id}/status", response_model=TicketInfo) # <<< Sửa route, dùng PUT và path param
# <<< THÊM (db: Session = Depends(get_db))
# <<< Sử dụng Pydantic Model
def update_ticket_status( # <<< Đổi tên hàm
    ticket_id: int,
    req: TicketStatusUpdate,
    db: Session = Depends(get_db)
):
    # <<< TRUYỀN `db`
    updated_ticket = change_status_tickets(db, ticket_id, req.status)
    return updated_ticket

@router.get("/teachers/{user_id}/performance", response_model=TeacherPerformance) # <<< Sửa route, dùng GET và path param
# <<< THÊM (db: Session = Depends(get_db))
def get_teacher_performance(user_id: int, db: Session = Depends(get_db)): # <<< Đổi tên hàm
    # <<< TRUYỀN `db`
    performance_data = view_teacher_performance(db, user_id)
    return performance_data

@router.get("/classes/unassigned", response_model=List[UnassignedClassInfo]) # <<< Sửa route và response_model
# <<< THÊM (db: Session = Depends(get_db))
def get_list_unassigned_classes(db: Session = Depends(get_db)): # <<< Đổi tên hàm
    # <<< TRUYỀN `db`
    classes = get_unassigned_classes(db)
    return classes

@router.post("/classes/assign-teacher", response_model=ClassInfo) # <<< Sửa route
# <<< THÊM (db: Session = Depends(get_db))
# <<< Sử dụng Pydantic Model
def assign_teacher_endpoint( # <<< Đổi tên hàm
    req: AssignTeacherRequest,
    db: Session = Depends(get_db)
):
    # <<< TRUYỀN `db`
    # user_id ở đây là user_id của Giảng viên cần gán
    result = assign_teacher_to_class(db, req.lecturer_user_id, req.class_id)
    return result

@router.get("/requests/class-assignments", response_model=List[ClassAssignmentRequestInfo]) # <<< Sửa route và response_model
# <<< THÊM (db: Session = Depends(get_db))
def get_list_class_assignment_requests(db: Session = Depends(get_db)): # <<< Đổi tên hàm
    # <<< TRUYỀN `db`
    requests = get_class_assignment_requests(db)
    return requests

@router.post("/requests/class-assignments/{ticket_id}/approve") # <<< Sửa route, dùng POST và path param
# <<< THÊM (db: Session = Depends(get_db))
def approve_class_request_endpoint( # <<< Đổi tên hàm
    ticket_id: int,
    db: Session = Depends(get_db)
):
    # <<< TRUYỀN `db`
    result = approve_class_assignment_request(db, ticket_id)
    return result

@router.post("/attendance/lecturer") # <<< Sửa route
# <<< THÊM (db: Session = Depends(get_db))
# <<< Sử dụng Pydantic Model
def take_lecturer_attendance_endpoint(
    req: LecturerAttendanceRequest,
    db: Session = Depends(get_db)
):
    # <<< TRUYỀN `db`
    result = take_lecturer_attendance(
        db,
        req.lecturer_id,
        req.class_id,
        req.attendance_status,
        req.notes
    )
    return result
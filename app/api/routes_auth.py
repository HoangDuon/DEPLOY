from fastapi import APIRouter, HTTPException
from app.schemas.user_schema import LoginRequest, TokenResponse, UserInfo, TicketCreateRequest
from app.schemas.notification_schema import NotificationRespone
from app.services.user_service import authenticate_user, create_access_token
from app.services.notification_service import get_all_notifications
from app.services.user_service import get_info_from_user_id
from app.services.user_service import submit_ticket, update_password

router = APIRouter()

# User Login
@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest) -> TokenResponse:
    user_data = authenticate_user(data.username, data.password)
    if user_data:
        print(f"user.password_hash in DB: {user_data["password_hash"]}")
    if not user_data:
        raise HTTPException(status_code=401, detail="Invalid User or Password")
    
    user_id = user_data["user_id"]
    user_name = user_data["username"]
    role_name = user_data["role"]

    token = create_access_token({"sub": user_name, "role": role_name})

    return TokenResponse(
        access_token = token, 
        token_type = "bearer",
        user_id = user_id,
        user_name = user_name,
        user_role = role_name,
    )

# Get User Info by user_id
@router.get("/user/{user_id}", response_model=UserInfo)
def get_user_info(user_id: int) -> UserInfo:
    user = get_info_from_user_id(user_id)

    username = user.name
    email = user.email

    return {
        "username": username,
        "email": email
    }   

@router.post("/ticket/submit")
def submit_ticket_endpoint(data: TicketCreateRequest):

    ticket = submit_ticket(data.user_id, data.user_assigned, data.title, data.issue_type, data.description, data.status)

    return {"message": "Ticket submitted successfully", "ticket_id": ticket.ticket_id}


@router.put("/admin/user/update-password", response_model=UserInfo)
def admin_update_user_password(user_id: int, new_password: str):
    """
    Endpoint cho phép Admin reset mật khẩu cho bất kỳ người dùng nào.
    Yêu cầu: user_id và mật khẩu mới (gửi dưới dạng Query Parameters).
    Vd: /admin/user/update-password?user_id=2&new_password=abc
    """
    
    # !!! CẢNH BÁO BẢO MẬT !!!
    # Route này RẤT nguy hiểm. Bạn PHẢI bảo vệ nó bằng cách
    # yêu cầu token (JWT) và kiểm tra xem vai trò (role)
    # của người gọi có phải là "Admin" hay không.
    # (Hiện tại, bất kỳ ai cũng có thể gọi nó)
    
    try:
        user = update_password(
            user_id=user_id, 
            new_password=new_password
        )
        return {
            "username": user.name,
            "email": user.email
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
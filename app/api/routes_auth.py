from fastapi import APIRouter, Depends, HTTPException
from app.schemas.user_schema import LoginRequest, TokenResponse
from app.services.user_service import authenticate_user, create_access_token

router = APIRouter(tags=["Authentication"])

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
        user_role = role_name
    )

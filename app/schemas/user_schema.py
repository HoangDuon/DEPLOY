from pydantic import BaseModel, Field

class LoginRequest(BaseModel):
    username: str = Field(..., example="manager")
    password: str = Field(..., example="123456")

    class Config:
        json_schema_extra = {
            "example": {
                "username": "Manager One",
                "password": "123456"
            }
        }

class TokenResponse(BaseModel):
    access_token: str
    token_type: str 
    user_id: int
    user_name: str
    user_role: str

class UserInfo(BaseModel):
    id: int
    username: str
    role: str

    class Config:
        from_attributes = True
from pydantic import BaseModel
from typing import Optional

class CreateUserRequest(BaseModel):
    name: str
    email: str
    password: str
    role_id: int


class UpdateUserRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    role_id: Optional[int] = None
    status: Optional[str] = None

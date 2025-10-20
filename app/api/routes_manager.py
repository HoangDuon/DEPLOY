from fastapi import APIRouter, HTTPException, Response, status
from app.schemas.manager_schema import CreateUserRequest, UpdateUserRequest
from app.services import manage_account_service

router = APIRouter(tags=["Manager"])

@router.get("/ping")
def ping():
    """Simple health endpoint for manager routes."""
    return {"message": "manager routes ok"}


@router.get("/users")
def list_users():
    return manage_account_service.list_users()


@router.get("/users/{user_id}")
def get_user(user_id: int):
    u = manage_account_service.get_user(user_id)
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    return u


@router.post("/users", status_code=status.HTTP_201_CREATED)
def create_user(req: CreateUserRequest):
    """Create a user. Returns 201 on success or raises HTTPException on failure."""
    return manage_account_service.create_user(req.name, req.email, req.password, req.role_id)


@router.put("/users/{user_id}")
def update_user(user_id: int, req: UpdateUserRequest):
    data = req.dict(exclude_none=True)
    return manage_account_service.update_user(user_id, **data)


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int):
    """Delete a user. Returns 204 No Content on success."""
    manage_account_service.delete_user(user_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

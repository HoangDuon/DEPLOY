from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import routes_auth, routes_notification, routes_student
from app.db import database
from app.core.config import settings

# Khởi tạo database
database.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title=settings.PROJECT_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # hoặc ["http://localhost:3000"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to the Internal LMS API"}

# Đăng ký router
app.include_router(routes_auth.router, prefix="/auth", tags=["Auth"])
app.include_router(routes_notification.router, prefix="/notify", tags=["Notification"])
app.include_router(routes_student.router, prefix="/student", tags=["Student"])
# app.include_router(routes_manager.router, prefix="/manager", tags=["Manager"])
# app.include_router(routes_lec.router, prefix="/lec", tags=["Lecturer"])
# app.include_router(routes_cs.router, prefix="/cs", tags=["Customer Support"])
# app.include_router(routes_tc.router, prefix="/tc", tags=["Training Coordinator"])

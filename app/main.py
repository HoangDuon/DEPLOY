from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import routes_auth, routes_notification, routes_student
from app.api import routes_customer_support
from app.api import routes_manager
from app.api import routes_auth
from app.api import routes_auth, routes_notification, routes_student, routes_lecturer, routes_teacher_coordinator, routes_files
from app.db import database
from app.core.config import settings

# Khởi tạo database
database.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title=settings.PROJECT_NAME)

origins = [
    "https://deploy-fhtg.onrender.com"
    "http://127.0.0.1:5500",
    "http://localhost:5500"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # hoặc ["http://localhost:3000"]
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
app.include_router(routes_manager.router, prefix="/manager", tags=["Manager"])
app.include_router(routes_lecturer.router, prefix="/lec", tags=["Lecturer"])
app.include_router(routes_customer_support.router, prefix="/cs", tags=["Customer Support"])
app.include_router(routes_teacher_coordinator.router, prefix="/tc", tags=["Teacher Coordinator"])
app.include_router(routes_files.router, prefix="/tc", tags=["Files"])

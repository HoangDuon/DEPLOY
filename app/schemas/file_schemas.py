from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List # <<< Thêm List
from app.models.files import TaskTypeEnum # Import Enum từ model

# --- Cấu hình chung ---
class ConfigBase(BaseModel):
    class Config:
        from_attributes = True # Dùng cho Pydantic v2+

# --- File Schemas ---
class FileResponse(ConfigBase):
    file_id: int
    original_filename: str
    saved_filename: str
    uploader_user_id: int
    content_type: Optional[str] = None # Đổi thành Optional[str]
    file_size: int

# --- Task Schemas ---
class TaskResponse(ConfigBase):
    task_id: int
    class_id: int
    title: str
    description: Optional[str] = None # Đổi thành Optional[str]
    task_type: TaskTypeEnum
    due_date: Optional[datetime] = None
    
    attached_file: Optional[FileResponse] = None # Đổi thành Optional[FileResponse]

# --- Submission Schemas ---

# <<< THÊM SCHEMA CON CHO SINH VIÊN >>>
class StudentBasicInfo(ConfigBase):
    student_id: int
    user_id: int
    name: str # Lấy từ relationship user

class SubmissionResponse(ConfigBase):
    submission_id: int
    task_id: int
    # student_id: int # <<< Bỏ student_id riêng lẻ
    submission_date: datetime
    grade: Optional[float] = None # Đổi thành Optional[float]
    feedback_text: Optional[str] = None # Đổi thành Optional[str]
    
    student: StudentBasicInfo # <<< THAY THẾ: Dùng schema con student
    
    submitted_file: FileResponse # File nộp là bắt buộc
    graded_file: Optional[FileResponse] = None # Đổi thành Optional[FileResponse]
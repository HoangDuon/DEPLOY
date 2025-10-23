from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from app.models.files import TaskTypeEnum # Import Enum từ model

# --- Cấu hình chung ---
class ConfigBase(BaseModel):
    class Config:
        from_attributes = True # (hoặc orm_mode = True)

# --- File Schemas ---
class FileResponse(ConfigBase):
    file_id: int
    original_filename: str
    saved_filename: str
    uploader_user_id: int
    content_type: str | None
    file_size: int

# --- Task Schemas ---
class TaskResponse(ConfigBase):
    task_id: int
    class_id: int
    title: str
    description: str | None
    task_type: TaskTypeEnum
    due_date: Optional[datetime] = None
    
    # Dùng relationship để lấy file đính kèm (nếu có)
    attached_file: FileResponse | None = None

# --- Submission Schemas ---
class SubmissionResponse(ConfigBase):
    submission_id: int
    task_id: int
    student_id: int
    submission_date: datetime
    grade: float | None
    feedback_text: str | None
    
    # Dùng relationship để lấy file đã nộp
    submitted_file: FileResponse
    # Dùng relationship để lấy file đã chấm (nếu có)
    graded_file: FileResponse | None = None

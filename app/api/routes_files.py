from fastapi import (
    APIRouter, 
    HTTPException, 
    UploadFile, 
    File, 
    Form, 
    Depends,
    status
)
from fastapi.responses import FileResponse
# Import các Schemas (Pydantic models)
from app.schemas.file_schemas import TaskResponse, SubmissionResponse

# Import các services (ĐÃ CẬP NHẬT)
from app.services.files_service import (
    # KHÔNG CẦN import 'save_file_to_disk' hay 'create_file_record' nữa
    get_file_record_by_saved_name,  
    create_task_for_class,          # (async)
    get_tasks_for_class,
    create_submission,              # (async)
    get_submissions_for_task,
    get_submission_by_student,
    grade_submission,         
    update_task_file,
    delete_graded_file,
    delete_task_file       # (async)
)
# Import Enum từ model
from app.models.files import TaskTypeEnum



# Khởi tạo router
router = APIRouter(
    prefix="/files", # Mọi API trong file này sẽ bắt đầu bằng /files
)

# --- API CHO FILES ---

@router.delete("/task/{task_id}/file", response_model=TaskResponse)
async def delete_task_file_route(
    task_id: int,
    uploader_user_id: int = Form(...) # user_id của GV
):
    """
    (Giảng viên) Xóa file đính kèm khỏi một Task (set NULL).
    """
    try:
        updated_task = await delete_task_file(
            task_id=task_id,
            uploader_user_id=uploader_user_id
        )
        return updated_task
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/submission/{submission_id}/file", response_model=SubmissionResponse)
async def delete_graded_file_route(
    submission_id: int,
    uploader_user_id: int = Form(...) # user_id của GV
):
    """
    (Giảng viên) Xóa file chấm bài (feedback) khỏi một Submission (set NULL).
    """
    try:
        updated_submission = await delete_graded_file(
            submission_id=submission_id,
            uploader_user_id=uploader_user_id
        )
        return updated_submission
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/task/{task_id}/file", response_model=TaskResponse)
async def update_task_file_route(
    task_id: int,
    uploader_user_id: int = Form(...), 
    file: UploadFile = File(...)
):
    """
    (Giảng viên) Cập nhật file đính kèm cho một Task (bài giảng, đề bài).
    """
    try:
        updated_task = await update_task_file(
            task_id=task_id,
            uploader_user_id=uploader_user_id,
            file=file
        )
        return updated_task
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/download/{saved_filename}")
async def download_file(saved_filename: str):
    """
    Tải một file về dựa trên tên đã lưu (UUID).
    (Hàm này giữ nguyên, nó đã đúng)
    """
    try:
        file_record, file_path = get_file_record_by_saved_name(saved_filename)
        
        return FileResponse(
            path=file_path,
            filename=file_record.original_filename,
            media_type='application/octet-stream'
        )
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- API CHO TASKS (Bài giảng / Bài tập) ---

@router.get("/class/{class_id}/tasks", response_model=list[TaskResponse])
def get_tasks_route(class_id: int):
    """
    Lấy tất cả Tasks (bài giảng và bài tập) của một lớp học.
    (Hàm này giữ nguyên, nó đã đúng)
    """
    try:
        return get_tasks_for_class(class_id)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/class/{class_id}/tasks", response_model=TaskResponse)
async def create_task_route(
    class_id: int,
    # Dùng Form(...) để nhận dữ liệu multipart (vì có upload file)
    title: str = Form(...),
    description: str = Form(None),
    task_type: TaskTypeEnum = Form(...),
    uploader_user_id: int = Form(...), # ID của GV (lấy từ auth)
    due_date: str = Form(None),
    file: UploadFile = File(None) # File đính kèm là tùy chọn
):
    """
    (Giảng viên) Tạo một Task mới (material hoặc assignment) cho lớp.
    (ĐÃ REFACTOR)
    """
    try:
        # Service 'create_task_for_class' SẼ TỰ ĐỘNG:
        # 1. Kiểm tra quyền GV
        # 2. Lưu file (nếu có)
        # 3. Tạo record file (nếu có)
        # 4. Tạo task
        # 5. Commit transaction
        # 6. Trả về task đã load
        new_task = await create_task_for_class(
            class_id=class_id,
            title=title,
            description=description,
            task_type=task_type,
            uploader_user_id=uploader_user_id, # Truyền user_id của GV
            due_date=due_date,
            file=file # Truyền thẳng đối tượng UploadFile
        )
        return new_task
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- API CHO SUBMISSIONS (Bài nộp) ---

@router.post("/task/{task_id}/submit", response_model=SubmissionResponse)
async def create_submission_route(
    task_id: int,
    uploader_user_id: int = Form(...), # (ĐÃ THAY ĐỔI) user_id của sinh viên
    file: UploadFile = File(...) # Bài nộp là bắt buộc
    # BỎ 'student_id', service sẽ tự tìm từ 'uploader_user_id'
):
    """
    (Sinh viên) Nộp bài cho một Assignment (Task).
    (ĐÃ REFACTOR)
    """
    if not file:
        raise HTTPException(status_code=400, detail="Bắt buộc phải có file bài nộp.")

    try:
        # Service 'create_submission' SẼ TỰ ĐỘNG:
        # 1. Tìm student_id từ uploader_user_id
        # 2. Kiểm tra SV có trong lớp không
        # 3. Kiểm tra đã nộp chưa
        # 4. Lưu file
        # 5. Tạo record file
        # 6. Tạo submission
        # 7. Commit transaction
        new_submission = await create_submission(
            task_id=task_id,
            uploader_user_id=uploader_user_id,
            file=file
        )
        return new_submission
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/task/{task_id}/submissions", response_model=list[SubmissionResponse])
def get_submissions_for_task_route(task_id: int):
    """
    (Giảng viên) Lấy tất cả bài nộp của một Task.
    (Hàm này giữ nguyên, nó đã đúng)
    """
    try:
        return get_submissions_for_task(task_id)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/task/{task_id}/student/{student_id}", response_model=SubmissionResponse)
def get_submission_by_student_route(task_id: int, student_id: int):
    """
    (Sinh viên/GV) Lấy bài nộp của 1 SV cho 1 Task.
    (Giữ nguyên API, client chịu trách nhiệm cung cấp student_id)
    """
    try:
        return get_submission_by_student(task_id, student_id)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/submission/{submission_id}/grade", response_model=SubmissionResponse)
async def grade_submission_route(
    submission_id: int,
    grade: float = Form(...),
    feedback_text: str = Form(None),
    uploader_user_id: int = Form(...), # user_id của giảng viên
    file: UploadFile = File(None) # File chấm bài (tùy chọn)
):
    """
    (Giảng viên) Chấm điểm và trả file feedback cho một bài nộp.
    (ĐÃ REFACTOR)
    """
    try:
        # Service 'grade_submission' SẼ TỰ ĐỘNG:
        # 1. Kiểm tra quyền GV
        # 2. Lưu file (nếu có)
        # 3. Tạo record file (nếu có)
        # 4. Cập nhật submission
        # 5. Commit
        updated_submission = await grade_submission(
            submission_id=submission_id,
            grade=grade,
            feedback_text=feedback_text,
            uploader_user_id=uploader_user_id,
            file=file
        )
        return updated_submission
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
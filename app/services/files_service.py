import os
import uuid
import aiofiles
from datetime import datetime # <-- Thêm import này
from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session, joinedload
from app.db.database import SessionLocal

# Import các models
from app.models.files import File, Task, Submission, TaskTypeEnum
from app.models.class_ import Class
from app.models.student import Student
from app.models.user import User
from app.models.lecturer import Lecturer
from app.models.class_assignment import ClassAssignment

# Thư mục upload
UPLOAD_DIRECTORY = "./uploads" 

async def save_file_to_disk(file: UploadFile) -> str:
    """
    Lưu file vật lý vào đĩa và trả về tên file đã lưu (UUID).
    """
    try:
        extension = os.path.splitext(file.filename)[1]
        safe_filename = f"{uuid.uuid4()}{extension}"
        file_path = os.path.join(UPLOAD_DIRECTORY, safe_filename)

        async with aiofiles.open(file_path, 'wb') as out_file:
            await file.seek(0)
            while content := await file.read(1024 * 1024):
                await out_file.write(content)
        
        return safe_filename
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Không thể lưu file vào đĩa: {e}"
        )

def _create_file_record_in_session(
    db: Session, 
    uploader_user_id: int, 
    file: UploadFile,
    saved_filename: str
) -> File:
    """
    (Hàm nội bộ) Tạo metadata file và ADD vào session.
    Hàm này KHÔNG commit.
    """
    uploader = db.query(User).filter(User.user_id == uploader_user_id).first()
    if not uploader:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User ID (uploader) {uploader_user_id} không tồn tại."
        )

    # Lấy file size từ UploadFile object (đã seek)
    file_size = file.size
    
    db_file = File(
        uploader_user_id=uploader_user_id,
        original_filename=file.filename,
        saved_filename=saved_filename,
        file_size=file_size, 
        content_type=file.content_type
    )
    db.add(db_file)
    return db_file

def get_file_record_by_saved_name(saved_filename: str):
    """
    Lấy thông tin file (metadata) từ DB bằng tên đã lưu (UUID).
    Dùng cho endpoint download.
    """
    db = SessionLocal()
    try:
        if ".." in saved_filename or "/" in saved_filename:
            raise HTTPException(status_code=400, detail="Tên file không hợp lệ.")
            
        file_record = db.query(File).filter(File.saved_filename == saved_filename).first()
        
        if not file_record:
            raise HTTPException(status_code=404, detail="Không tìm thấy file trong database.")
        
        file_path = os.path.join(UPLOAD_DIRECTORY, file_record.saved_filename)
        if not os.path.isfile(file_path):
            raise HTTPException(status_code=500, detail="Lỗi hệ thống: File có trong DB.")
            
        return file_record, file_path
        
    finally:
        db.close()

# ==================================================
# TASK SERVICES (Bài giảng & Bài tập)
# ==================================================

async def update_task_file(
    task_id: int,
    uploader_user_id: int, # user_id của GV
    file: UploadFile
):
    """
    (HÀM MỚI) Cho phép GV cập nhật file đính kèm (attached_file_id)
    cho một Task đã tồn tại.
    """
    if not file:
        raise HTTPException(status_code=400, detail="Bắt buộc phải có file.")

    db = SessionLocal()
    try:
        # 1. Kiểm tra Task (SỬA: Dùng 'class_obj' thay vì 'class_')
        db_task = db.query(Task).options(
            joinedload(Task.class_obj) # Load class để check quyền
        ).filter(Task.task_id == task_id).first()
        
        if not db_task:
            raise HTTPException(status_code=404, detail="Bài tập (Task) không tồn tại.")

        # 2. Kiểm tra quyền GV
        lecturer = db.query(Lecturer).filter(Lecturer.user_id == uploader_user_id).first()
        if not lecturer:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Hồ sơ giảng viên không tồn tại."
            )
        
        # (SỬA: Dùng 'class_obj')
        if db_task.class_obj.lecturer_id != lecturer.lecturer_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền chỉnh sửa Task của lớp này."
            )

        # 3. Xử lý file
        saved_filename = await save_file_to_disk(file)
        db_file = _create_file_record_in_session(db, uploader_user_id, file, saved_filename)
        db.flush() # Lấy file_id mới

        # 4. Cập nhật Task
        db_task.attached_file_id = db_file.file_id
        
        # 5. Commit
        db.commit()

        # 6. Query lại để trả về
        final_task = db.query(Task).options(
            joinedload(Task.attached_file) 
        ).filter(Task.task_id == task_id).first()
        
        if final_task.due_date and str(final_task.due_date) == '0000-00-00 00:00:00':
            final_task.due_date = None
            
        return final_task

    except Exception as e:
        db.rollback()
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=f"Lỗi khi cập nhật file: {e}")
    finally:
        db.close()

async def create_task_for_class(
    class_id: int, 
    title: str, 
    description: str,
    task_type: TaskTypeEnum,
    uploader_user_id: int, # Đây là user_id của GV
    due_date: str = None, 
    file: UploadFile = None 
):
    """
    (ĐÃ SỬA) Tạo TASK, tự động xử lý file upload.
    Kiểm tra quyền GV dựa trên bảng Lecturers.
    """
    db = SessionLocal()
    try:
        # 1. Kiểm tra lớp học
        db_class = db.query(Class).filter(Class.class_id == class_id).first()
        if not db_class:
            raise HTTPException(status_code=404, detail="Lớp học không tồn tại.")
        
        # 2. (LOGIC MỚI) Kiểm tra quyền GV
        lecturer = db.query(Lecturer).filter(Lecturer.user_id == uploader_user_id).first()
        if not lecturer:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Hồ sơ giảng viên không tồn tại cho người dùng này."
            )
        
        if db_class.lecturer_id != lecturer.lecturer_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền tạo bài tập cho lớp này."
            )
        
        db_file = None
        attached_file_id = None

        # 3. Xử lý file (nếu có)
        if file:
            saved_filename = await save_file_to_disk(file)
            db_file = _create_file_record_in_session(db, uploader_user_id, file, saved_filename)
            db.flush() 
            attached_file_id = db_file.file_id

        # 4. Tạo Task
        db_task = Task(
            class_id=class_id,
            title=title,
            description=description,
            task_type=task_type,
            due_date=due_date,
            attached_file_id=attached_file_id
        )
        db.add(db_task)
        
        # 5. Commit 1 lần
        db.commit()
        
        # 6. Query lại (Fix lỗi Detached & Datetime)
        new_task_id = db_task.task_id
        final_task = db.query(Task).options(
            joinedload(Task.attached_file) 
        ).filter(Task.task_id == new_task_id).first()
        
        if final_task.due_date and str(final_task.due_date) == '0000-00-00 00:00:00':
            final_task.due_date = None
            
        return final_task
        
    except Exception as e:
        db.rollback()
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=f"Lỗi khi tạo task: {e}")
    finally:
        db.close()

def get_tasks_for_class(class_id: int):
    """(Giữ nguyên) Lấy tất cả task cho lớp học, đã Eager Load file."""
    db = SessionLocal()
    try:
        tasks = (
            db.query(Task)
            .options(joinedload(Task.attached_file))
            .filter(Task.class_id == class_id)
            .order_by(Task.task_id.desc())
            .all()
        )
        
        for task in tasks:
            if task.due_date and str(task.due_date) == '0000-00-00 00:00:00':
                task.due_date = None
        return tasks
    finally:
        db.close()
        
# ==================================================
# SUBMISSION SERVICES (Bài nộp)
# ==================================================

async def create_submission(
    task_id: int, 
    uploader_user_id: int, # Đây là user_id của SV
    file: UploadFile
):
    """
    (ĐÃ SỬA) Tạo MỚI hoặc CẬP NHẬT (nộp lại) bài nộp.
    """
    db = SessionLocal()
    try:
        # 1. Kiểm tra Task (SỬA: Dùng 'class_obj')
        db_task = db.query(Task).options(
            joinedload(Task.class_obj) # Load class để check quyền
        ).filter(Task.task_id == task_id).first()
        
        if not db_task:
            raise HTTPException(status_code=404, detail="Bài tập không tồn tại.")
        if db_task.task_type != TaskTypeEnum.assignment:
            raise HTTPException(status_code=400, detail="Không thể nộp bài cho 'material'.")

        # 2. Tìm Student từ uploader_user_id
        db_student = db.query(Student).filter(Student.user_id == uploader_user_id).first()
        
        if not db_student:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="Không tìm thấy hồ sơ sinh viên cho người dùng này."
            )
        
        student_id_found = db_student.student_id

        # 3. Kiểm tra SV có trong lớp học không (qua bảng class_assignments)
        class_id_of_task = db_task.class_id
        enrollment = db.query(ClassAssignment).filter(
            ClassAssignment.student_id == student_id_found,
            ClassAssignment.class_id == class_id_of_task
        ).first()

        if not enrollment:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="Sinh viên không thuộc lớp học này."
            )

        # 4. Xử lý file (luôn luôn)
        saved_filename = await save_file_to_disk(file)
        db_file = _create_file_record_in_session(db, uploader_user_id, file, saved_filename)
        db.flush() # Lấy file_id mới

        # 5. (LOGIC MỚI) Kiểm tra đã nộp chưa
        existing_submission = db.query(Submission).filter(
            Submission.task_id == task_id,
            Submission.student_id == student_id_found
        ).first()
        
        if existing_submission:
            # === LOGIC CẬP NHẬT (NỘP LẠI) ===
            existing_submission.submitted_file_id = db_file.file_id
            existing_submission.grade = None
            existing_submission.feedback_text = None
            existing_submission.graded_file_id = None
            existing_submission.submission_date = datetime.utcnow() 
            
            db.commit()
            db_submission = existing_submission # Gán để re-query
        
        else:
            # === LOGIC TẠO MỚI (NỘP LẦN ĐẦU) ===
            db_submission = Submission(
                task_id=task_id,
                student_id=student_id_found,
                submitted_file_id=db_file.file_id
            )
            db.add(db_submission)
            db.commit()
        
        # 6. Query lại (Fix lỗi Detached)
        new_submission_id = db_submission.submission_id
        final_submission = db.query(Submission).options(
            joinedload(Submission.submitted_file),
            joinedload(Submission.graded_file)
        ).filter(Submission.submission_id == new_submission_id).first()
        
        return final_submission
        
    except Exception as e:
        db.rollback()
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=f"Lỗi khi nộp bài: {e}")
    finally:
        db.close()

def get_submissions_for_task(task_id: int):
    """(Giữ nguyên) Lấy tất cả bài nộp của một Task, đã Eager Load."""
    db = SessionLocal()
    try:
        submissions = db.query(Submission).options(
            joinedload(Submission.student).joinedload(Student.user),
            joinedload(Submission.submitted_file),
            joinedload(Submission.graded_file)
        ).filter(Submission.task_id == task_id).all()
        
        return submissions
    finally:
        db.close()

def get_submission_by_student(task_id: int, student_id: int):
    """
    (Giữ nguyên) Lấy bài nộp của một student_id cụ thể.
    """
    db = SessionLocal()
    try:
        submission = db.query(Submission).options(
            joinedload(Submission.submitted_file),
            joinedload(Submission.graded_file)
        ).filter(
            Submission.task_id == task_id,
            Submission.student_id == student_id
        ).first()
        
        if not submission:
            raise HTTPException(status_code=404, detail="Không tìm thấy bài nộp của bạn.")
            
        return submission
    finally:
        db.close()

async def grade_submission(
    submission_id: int, 
    grade: float, 
    feedback_text: str,
    uploader_user_id: int, # Đây là user_id của GV
    file: UploadFile = None 
):
    """
    (ĐÃ SỬA) Chấm điểm.
    Kiểm tra quyền GV dựa trên bảng Lecturers.
    """
    db = SessionLocal()
    try:
        # 1. Tìm bài nộp (SỬA: Dùng 'class_obj')
        db_submission = db.query(Submission).options(
            joinedload(Submission.task).joinedload(Task.class_obj) # Load Task -> Class
        ).filter(Submission.submission_id == submission_id).first()
        
        if not db_submission:
            raise HTTPException(status_code=404, detail="Bài nộp không tồn tại.")
        
        # 2. (LOGIC MỚI) Kiểm tra quyền GV
        lecturer = db.query(Lecturer).filter(Lecturer.user_id == uploader_user_id).first()
        if not lecturer:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Hồ sơ giảng viên không tồn tại cho người dùng này."
            )

        # (SỬA: Dùng 'class_obj' và 'lecturer_id')
        class_lecturer_id = db_submission.task.class_obj.lecturer_id
        
        if class_lecturer_id != lecturer.lecturer_id:
           raise HTTPException(
               status_code=status.HTTP_403_FORBIDDEN, 
               detail="Bạn không có quyền chấm bài này."
            )

        graded_file_id = None
        # 3. Xử lý file (nếu có)
        if file:
            saved_filename = await save_file_to_disk(file)
            db_file = _create_file_record_in_session(db, uploader_user_id, file, saved_filename)
            db.flush()
            graded_file_id = db_file.file_id

        # 4. Cập nhật điểm
        db_submission.grade = grade
        db_submission.feedback_text = feedback_text
        if graded_file_id:
            # (Cho phép GV cập nhật file chấm lại)
            db_submission.graded_file_id = graded_file_id
            
        # 5. Commit
        db.commit()
        
        # 6. Query lại (Fix lỗi Detached)
        final_submission = db.query(Submission).options(
            joinedload(Submission.graded_file),
            joinedload(Submission.submitted_file)
        ).filter(Submission.submission_id == submission_id).first()

        return final_submission
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi khi chấm điểm: {e}")
    finally:
        db.close()


async def delete_task_file(
    task_id: int,
    uploader_user_id: int # user_id của GV
):
    """
    (HÀM MỚI) Cho phép GV xóa file đính kèm (set NULL)
    khỏi một Task đã tồn tại.
    """
    db = SessionLocal()
    try:
        # 1. Kiểm tra Task và load quyền
        db_task = db.query(Task).options(
            joinedload(Task.class_obj) # Load class để check quyền
        ).filter(Task.task_id == task_id).first()
        
        if not db_task:
            raise HTTPException(status_code=404, detail="Bài tập (Task) không tồn tại.")

        # 2. Kiểm tra quyền GV
        lecturer = db.query(Lecturer).filter(Lecturer.user_id == uploader_user_id).first()
        if not lecturer:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Hồ sơ giảng viên không tồn tại."
            )
        
        if db_task.class_obj.lecturer_id != lecturer.lecturer_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền chỉnh sửa Task của lớp này."
            )
            
        # 3. Kiểm tra xem Task có file để xóa không
        if not db_task.attached_file_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Task này không có file đính kèm để xóa."
            )

        # 4. Cập nhật (Xóa liên kết file)
        db_task.attached_file_id = None
        
        # 5. Commit
        db.commit()

        # 6. Query lại để trả về
        final_task = db.query(Task).options(
            joinedload(Task.attached_file) 
        ).filter(Task.task_id == task_id).first()
        
        if final_task.due_date and str(final_task.due_date) == '0000-00-00 00:00:00':
            final_task.due_date = None
            
        return final_task

    except Exception as e:
        db.rollback()
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=f"Lỗi khi xóa file khỏi task: {e}")
    finally:
        db.close()

# (Thêm vào file files_service.py)

async def delete_graded_file(
    submission_id: int, 
    uploader_user_id: int # Đây là user_id của GV
):
    """
    (HÀM MỚI) Chấm điểm.
    Cho phép GV xóa file chấm bài (set NULL) khỏi một Submission.
    """
    db = SessionLocal()
    try:
        # 1. Tìm bài nộp
        db_submission = db.query(Submission).options(
            joinedload(Submission.task).joinedload(Task.class_obj) # Load Task -> Class
        ).filter(Submission.submission_id == submission_id).first()
        
        if not db_submission:
            raise HTTPException(status_code=404, detail="Bài nộp không tồn tại.")
        
        # 2. Kiểm tra quyền GV
        lecturer = db.query(Lecturer).filter(Lecturer.user_id == uploader_user_id).first()
        if not lecturer:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Hồ sơ giảng viên không tồn tại cho người dùng này."
            )

        class_lecturer_id = db_submission.task.class_obj.lecturer_id
        
        if class_lecturer_id != lecturer.lecturer_id:
           raise HTTPException(
               status_code=status.HTTP_403_FORBIDDEN, 
               detail="Bạn không có quyền chấm bài này."
            )

        # 3. Kiểm tra xem có file để xóa không
        if not db_submission.graded_file_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bài nộp này không có file chấm bài để xóa."
            )
            
        # 4. Cập nhật (Xóa liên kết file)
        db_submission.graded_file_id = None
            
        # 5. Commit
        db.commit()
        
        # 6. Query lại
        final_submission = db.query(Submission).options(
            joinedload(Submission.graded_file),
            joinedload(Submission.submitted_file)
        ).filter(Submission.submission_id == submission_id).first()

        return final_submission
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi khi xóa file chấm bài: {e}")
    finally:
        db.close()
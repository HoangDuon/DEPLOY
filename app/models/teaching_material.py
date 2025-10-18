from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.database import Base

class TeachingMaterial(Base):
    __tablename__ = "TEACHING_MATERIALS"

    material_id = Column(Integer, primary_key=True, autoincrement=True)
    class_id = Column(Integer, ForeignKey("CLASSES.class_id", onupdate="CASCADE", ondelete="CASCADE"), nullable=False)
    lecturer_id = Column(Integer, ForeignKey("LECTURERS.lecturer_id", onupdate="CASCADE", ondelete="SET NULL"))
    file_url = Column(String(255), nullable=False)
    upload_date = Column(DateTime, default=datetime.utcnow, nullable=False)

    class_ = relationship("Class", back_populates="materials")
    lecturer = relationship("Lecturer", back_populates="materials")

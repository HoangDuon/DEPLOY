from sqlalchemy import Column, Integer, Date, Enum
from sqlalchemy.orm import relationship
from app.db.database import Base
import enum

class StudentStatus(enum.Enum):
    active = "active"
    inactive = "inactive"

class Student(Base):
    __tablename__ = "STUDENTS"

    student_id = Column(Integer, primary_key=True, autoincrement=True)
    enrollment_date = Column(Date, nullable=False)
    status = Column(Enum(StudentStatus), default=StudentStatus.active, nullable=False)

    assignments = relationship("ClassAssignment", back_populates="student")

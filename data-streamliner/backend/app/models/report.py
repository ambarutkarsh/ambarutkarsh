from datetime import datetime
from typing import Optional, Any
from sqlalchemy import String, Boolean, DateTime, Integer, Enum as SAEnum, func, Text, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum
from app.core.database import Base


class ExecutionStatus(str, enum.Enum):
    success = "success"
    failed = "failed"


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    dataset_id: Mapped[int] = mapped_column(Integer, ForeignKey("datasets.id"), nullable=False)
    config: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)

    created_by: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    is_public: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    allowed_roles: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)

    dataset = relationship("Dataset", foreign_keys=[dataset_id])
    executions = relationship("ReportExecution", back_populates="report", cascade="all, delete-orphan")


class ReportExecution(Base):
    __tablename__ = "report_executions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    report_id: Mapped[int] = mapped_column(Integer, ForeignKey("reports.id", ondelete="CASCADE"), nullable=False)

    executed_by: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    executed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    execution_time_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    row_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    filters_applied: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)

    status: Mapped[ExecutionStatus] = mapped_column(SAEnum(ExecutionStatus), nullable=False)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    report = relationship("Report", back_populates="executions")

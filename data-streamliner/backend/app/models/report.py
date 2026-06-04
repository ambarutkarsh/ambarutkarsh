from sqlalchemy import Column, Integer, String, Boolean, DateTime, JSON, Enum, ForeignKey, Text, BigInteger
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..core.database import Base
import enum


class ExecutionStatus(str, enum.Enum):
    success = "success"
    failed = "failed"


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(String(1000))
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=False)
    config = Column(JSON, default=dict)  # selected fields, filters, chart type, etc.
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    is_public = Column(Boolean, default=False)
    allowed_roles = Column(JSON, default=list)

    executions = relationship("ReportExecution", back_populates="report")
    dataset = relationship("Dataset", foreign_keys=[dataset_id])


class ReportExecution(Base):
    __tablename__ = "report_executions"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("reports.id", ondelete="CASCADE"), nullable=False)
    executed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    executed_at = Column(DateTime(timezone=True), server_default=func.now())
    execution_time_ms = Column(BigInteger)
    row_count = Column(Integer)
    filters_applied = Column(JSON, default=dict)
    status = Column(Enum(ExecutionStatus), nullable=False)
    error_message = Column(Text)

    report = relationship("Report", back_populates="executions")

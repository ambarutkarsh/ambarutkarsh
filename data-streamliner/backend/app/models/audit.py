from sqlalchemy import Column, Integer, String, DateTime, JSON, ForeignKey, Text
from sqlalchemy.sql import func
from ..core.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    event_timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    user_id = Column(Integer, nullable=True)
    username = Column(String(255))
    event_type = Column(String(100), nullable=False, index=True)
    object_type = Column(String(100), index=True)
    object_id = Column(String(255))
    previous_value = Column(JSON)
    new_value = Column(JSON)
    ip_address = Column(String(50))
    status = Column(String(50), default="success")
    description = Column(Text)

from sqlalchemy import Column, Integer, String, Boolean, DateTime, JSON, Enum, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..core.database import Base
import enum


class DashboardStatus(str, enum.Enum):
    draft = "draft"
    published = "published"


class Dashboard(Base):
    __tablename__ = "dashboards"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(String(1000))
    layout = Column(JSON, default=dict)
    filters = Column(JSON, default=dict)
    status = Column(Enum(DashboardStatus), nullable=False, default=DashboardStatus.draft)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    allowed_roles = Column(JSON, default=list)

    widgets = relationship("DashboardWidget", back_populates="dashboard", cascade="all, delete-orphan")


class DashboardWidget(Base):
    __tablename__ = "dashboard_widgets"

    id = Column(Integer, primary_key=True, index=True)
    dashboard_id = Column(Integer, ForeignKey("dashboards.id", ondelete="CASCADE"), nullable=False)
    report_id = Column(Integer, ForeignKey("reports.id"), nullable=True)
    position = Column(JSON, default=dict)  # {x, y, w, h}
    title = Column(String(255))
    widget_type = Column(String(100), default="chart")

    dashboard = relationship("Dashboard", back_populates="widgets")

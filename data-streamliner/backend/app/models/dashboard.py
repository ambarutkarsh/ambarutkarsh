from datetime import datetime
from typing import Optional, Any
from sqlalchemy import String, Boolean, DateTime, Integer, Enum as SAEnum, func, Text, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum
from app.core.database import Base


class DashboardStatus(str, enum.Enum):
    draft = "draft"
    published = "published"


class Dashboard(Base):
    __tablename__ = "dashboards"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    layout: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    filters: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)

    status: Mapped[DashboardStatus] = mapped_column(
        SAEnum(DashboardStatus), default=DashboardStatus.draft, nullable=False
    )

    created_by: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    allowed_roles: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)

    widgets = relationship("DashboardWidget", back_populates="dashboard", cascade="all, delete-orphan")


class DashboardWidget(Base):
    __tablename__ = "dashboard_widgets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    dashboard_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("dashboards.id", ondelete="CASCADE"), nullable=False
    )
    report_id: Mapped[int] = mapped_column(Integer, ForeignKey("reports.id"), nullable=False)

    position: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    widget_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    dashboard = relationship("Dashboard", back_populates="widgets")
    report = relationship("Report", foreign_keys=[report_id])

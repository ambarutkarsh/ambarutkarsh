from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from ..models.dashboard import DashboardStatus


class DashboardWidgetBase(BaseModel):
    report_id: Optional[int] = None
    position: Dict[str, Any] = {}
    title: Optional[str] = None
    widget_type: str = "chart"


class DashboardWidgetCreate(DashboardWidgetBase):
    pass


class DashboardWidgetOut(DashboardWidgetBase):
    id: int
    dashboard_id: int

    class Config:
        from_attributes = True


class DashboardBase(BaseModel):
    name: str
    description: Optional[str] = None
    layout: Dict[str, Any] = {}
    filters: Dict[str, Any] = {}
    allowed_roles: List[str] = []


class DashboardCreate(DashboardBase):
    widgets: List[DashboardWidgetCreate] = []


class DashboardUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    layout: Optional[Dict[str, Any]] = None
    filters: Optional[Dict[str, Any]] = None
    allowed_roles: Optional[List[str]] = None
    widgets: Optional[List[DashboardWidgetCreate]] = None


class DashboardOut(DashboardBase):
    id: int
    status: DashboardStatus
    created_by: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    widgets: List[DashboardWidgetOut] = []

    class Config:
        from_attributes = True

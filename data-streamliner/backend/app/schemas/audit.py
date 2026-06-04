from pydantic import BaseModel
from typing import Optional, Any, Dict
from datetime import datetime


class AuditLogOut(BaseModel):
    id: int
    event_timestamp: datetime
    user_id: Optional[int] = None
    username: Optional[str] = None
    event_type: str
    object_type: Optional[str] = None
    object_id: Optional[str] = None
    previous_value: Optional[Dict[str, Any]] = None
    new_value: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    status: Optional[str] = None
    description: Optional[str] = None

    class Config:
        from_attributes = True


class AuditLogList(BaseModel):
    items: list
    total: int
    page: int
    page_size: int

from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from ..models.report import ExecutionStatus


class ReportBase(BaseModel):
    name: str
    description: Optional[str] = None
    dataset_id: int
    config: Dict[str, Any] = {}
    is_public: bool = False
    allowed_roles: List[str] = []


class ReportCreate(ReportBase):
    pass


class ReportUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    is_public: Optional[bool] = None
    allowed_roles: Optional[List[str]] = None


class ReportOut(ReportBase):
    id: int
    created_by: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ReportExecuteRequest(BaseModel):
    filters: Optional[Dict[str, Any]] = None
    limit: Optional[int] = None


class QueryResult(BaseModel):
    columns: List[str]
    rows: List[Dict[str, Any]]
    row_count: int
    execution_time_ms: int
    truncated: bool = False


class ChartRecommendation(BaseModel):
    chart_types: List[str]
    primary: str

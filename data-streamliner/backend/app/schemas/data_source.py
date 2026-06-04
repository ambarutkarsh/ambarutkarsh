from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.models.data_source import DbType


class DataSourceBase(BaseModel):
    name: str
    description: Optional[str] = None
    db_type: DbType
    host: str
    port: int
    database_name: str
    schema_name: Optional[str] = None
    username: str
    ssl_mode: Optional[str] = None
    connection_timeout: int = 10
    query_timeout: int = 30
    is_active: bool = True


class DataSourceCreate(DataSourceBase):
    password: str


class DataSourceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    host: Optional[str] = None
    port: Optional[int] = None
    database_name: Optional[str] = None
    schema_name: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    ssl_mode: Optional[str] = None
    connection_timeout: Optional[int] = None
    query_timeout: Optional[int] = None
    is_active: Optional[bool] = None


class DataSourceResponse(DataSourceBase):
    id: int
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ConnectionTestResult(BaseModel):
    success: bool
    message: str
    latency_ms: Optional[int] = None

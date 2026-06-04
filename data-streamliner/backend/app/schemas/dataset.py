from pydantic import BaseModel, Field
from typing import Optional, List, Any, Dict
from datetime import datetime
from ..models.dataset import SourceType, DatasetStatus, FieldType, DataType, AggregationType


class DatasetFieldBase(BaseModel):
    source_column: str
    business_name: str
    description: Optional[str] = None
    field_type: FieldType = FieldType.attribute
    data_type: DataType = DataType.string
    aggregation_type: AggregationType = AggregationType.none
    formula: Optional[str] = None
    format_string: Optional[str] = None
    decimal_places: int = 2
    is_visible: bool = True
    is_filterable: bool = True
    is_exportable: bool = True
    is_pii: bool = False
    sort_order: int = 0


class DatasetFieldCreate(DatasetFieldBase):
    pass


class DatasetFieldOut(DatasetFieldBase):
    id: int
    dataset_id: int

    class Config:
        from_attributes = True


class DatasetBase(BaseModel):
    name: str
    description: Optional[str] = None
    data_source_id: int
    source_type: SourceType = SourceType.table
    source_config: Optional[Dict[str, Any]] = None
    default_filters: Optional[Dict[str, Any]] = None


class DatasetCreate(DatasetBase):
    fields: List[DatasetFieldCreate] = []


class DatasetUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    source_type: Optional[SourceType] = None
    source_config: Optional[Dict[str, Any]] = None
    default_filters: Optional[Dict[str, Any]] = None
    fields: Optional[List[DatasetFieldCreate]] = None


class DatasetOut(DatasetBase):
    id: int
    status: DatasetStatus
    version: int
    created_by: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    published_at: Optional[datetime] = None
    fields: List[DatasetFieldOut] = []

    class Config:
        from_attributes = True

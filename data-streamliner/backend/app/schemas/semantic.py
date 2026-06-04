from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime


class SemanticLayerBase(BaseModel):
    name: str
    description: Optional[str] = None
    dataset_id: int
    mappings: Dict[str, Any] = {}


class SemanticLayerCreate(SemanticLayerBase):
    pass


class SemanticLayerUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    mappings: Optional[Dict[str, Any]] = None


class SemanticLayerOut(SemanticLayerBase):
    id: int
    created_by: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

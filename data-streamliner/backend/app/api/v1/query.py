from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from ...core.deps import get_db, get_current_user
from ...models.dataset import Dataset
from ...models.data_source import DataSource
from ...services.query_engine import QueryEngine
from ...schemas.report import QueryResult

router = APIRouter()
query_engine = QueryEngine()


class AdHocQueryRequest(BaseModel):
    dataset_id: int
    selected_fields: List[str]
    filters: Optional[Dict[str, Any]] = None
    limit: Optional[int] = None


@router.post("/", response_model=QueryResult)
def run_adhoc_query(req: AdHocQueryRequest, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    dataset = db.query(Dataset).filter(Dataset.id == req.dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    data_source = db.query(DataSource).filter(DataSource.id == dataset.data_source_id).first()
    if not data_source:
        raise HTTPException(status_code=404, detail="Data source not found")
    try:
        result = query_engine.execute(
            dataset=dataset,
            data_source=data_source,
            selected_field_names=req.selected_fields,
            filters=req.filters,
            limit=req.limit,
        )
        return QueryResult(
            columns=result.columns,
            rows=result.rows,
            row_count=result.row_count,
            execution_time_ms=result.execution_time_ms,
            truncated=result.truncated,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Query execution failed: {str(exc)}")

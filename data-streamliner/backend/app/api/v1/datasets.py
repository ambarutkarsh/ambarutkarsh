from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timezone
from ...core.deps import get_db, get_current_user, require_data_admin
from ...models.dataset import Dataset, DatasetField, DatasetStatus
from ...models.data_source import DataSource
from ...schemas.dataset import DatasetOut, DatasetCreate, DatasetUpdate, DatasetFieldOut
from ...services.query_engine import QueryEngine
from ...services.audit_service import log_event

router = APIRouter()
query_engine = QueryEngine()


@router.get("/", response_model=List[DatasetOut])
def list_datasets(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    q = db.query(Dataset)
    if not current_user.is_superuser and "admin" not in (current_user.roles or []):
        q = q.filter(Dataset.status == DatasetStatus.published)
    return q.all()


@router.post("/", response_model=DatasetOut, status_code=status.HTTP_201_CREATED)
def create_dataset(payload: DatasetCreate, db: Session = Depends(get_db), data_admin=Depends(require_data_admin)):
    ds_obj = Dataset(
        name=payload.name,
        description=payload.description,
        data_source_id=payload.data_source_id,
        source_type=payload.source_type,
        source_config=payload.source_config,
        default_filters=payload.default_filters or {},
        status=DatasetStatus.draft,
        version=1,
        created_by=data_admin.id,
    )
    db.add(ds_obj)
    db.flush()
    for f in payload.fields:
        field = DatasetField(dataset_id=ds_obj.id, **f.model_dump())
        db.add(field)
    db.commit()
    db.refresh(ds_obj)
    log_event(db, data_admin.id, data_admin.username, "DATASET_CREATED", "dataset", str(ds_obj.id))
    return DatasetOut.model_validate(ds_obj)


@router.get("/{dataset_id}", response_model=DatasetOut)
def get_dataset(dataset_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    ds_obj = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not ds_obj:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return DatasetOut.model_validate(ds_obj)


@router.put("/{dataset_id}", response_model=DatasetOut)
def update_dataset(dataset_id: int, payload: DatasetUpdate, db: Session = Depends(get_db), data_admin=Depends(require_data_admin)):
    ds_obj = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not ds_obj:
        raise HTTPException(status_code=404, detail="Dataset not found")
    ds_obj.version = (ds_obj.version or 1) + 1
    ds_obj.status = DatasetStatus.draft
    for k, v in payload.model_dump(exclude_unset=True, exclude={"fields"}).items():
        setattr(ds_obj, k, v)
    if payload.fields is not None:
        for existing in ds_obj.fields:
            db.delete(existing)
        db.flush()
        for f in payload.fields:
            field = DatasetField(dataset_id=ds_obj.id, **f.model_dump())
            db.add(field)
    db.commit()
    db.refresh(ds_obj)
    log_event(db, data_admin.id, data_admin.username, "DATASET_UPDATED", "dataset", str(dataset_id))
    return DatasetOut.model_validate(ds_obj)


@router.post("/{dataset_id}/publish")
def publish_dataset(dataset_id: int, db: Session = Depends(get_db), data_admin=Depends(require_data_admin)):
    ds_obj = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not ds_obj:
        raise HTTPException(status_code=404, detail="Dataset not found")
    ds_obj.status = DatasetStatus.published
    ds_obj.published_at = datetime.now(timezone.utc)
    db.commit()
    log_event(db, data_admin.id, data_admin.username, "DATASET_PUBLISHED", "dataset", str(dataset_id))
    return {"message": "Dataset published", "dataset_id": dataset_id}


@router.get("/{dataset_id}/fields", response_model=List[DatasetFieldOut])
def get_dataset_fields(dataset_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    ds_obj = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not ds_obj:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return [DatasetFieldOut.model_validate(f) for f in ds_obj.fields]


@router.get("/{dataset_id}/preview")
def preview_dataset(dataset_id: int, db: Session = Depends(get_db), data_admin=Depends(require_data_admin)):
    ds_obj = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not ds_obj:
        raise HTTPException(status_code=404, detail="Dataset not found")
    data_source = db.query(DataSource).filter(DataSource.id == ds_obj.data_source_id).first()
    if not data_source:
        raise HTTPException(status_code=404, detail="Data source not found")
    visible_fields = [f for f in ds_obj.fields if f.is_visible]
    if not visible_fields:
        raise HTTPException(status_code=400, detail="Dataset has no visible fields")
    try:
        result = query_engine.execute(
            dataset=ds_obj,
            data_source=data_source,
            selected_field_names=[f.source_column for f in visible_fields],
            filters={},
            limit=50,
        )
        return {"columns": result.columns, "rows": result.rows, "row_count": result.row_count}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))

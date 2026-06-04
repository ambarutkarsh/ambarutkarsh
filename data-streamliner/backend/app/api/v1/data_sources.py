from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from ...core.deps import get_db, require_admin
from ...core.security import encrypt_credential
from ...models.data_source import DataSource
from ...schemas.data_source import DataSourceOut, DataSourceCreate, DataSourceUpdate, ConnectionTestResult
from ...services.connection_service import test_connection, get_schemas, get_tables, get_columns
from ...services.audit_service import log_event

router = APIRouter()


@router.get("/", response_model=List[DataSourceOut])
def list_data_sources(db: Session = Depends(get_db), admin=Depends(require_admin)):
    return db.query(DataSource).filter(DataSource.is_active == True).all()


@router.post("/", response_model=DataSourceOut, status_code=status.HTTP_201_CREATED)
def create_data_source(payload: DataSourceCreate, db: Session = Depends(get_db), admin=Depends(require_admin)):
    ds = DataSource(
        name=payload.name,
        description=payload.description,
        db_type=payload.db_type,
        host=payload.host,
        port=payload.port,
        database_name=payload.database_name,
        schema_name=payload.schema_name,
        username=payload.username,
        encrypted_password=encrypt_credential(payload.password),
        ssl_mode=payload.ssl_mode,
        connection_timeout=payload.connection_timeout,
        query_timeout=payload.query_timeout,
        is_active=True,
        created_by=admin.id,
    )
    # Test connection before saving
    result = test_connection(ds)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=f"Connection test failed: {result['message']}")
    db.add(ds)
    db.commit()
    db.refresh(ds)
    log_event(db, admin.id, admin.username, "DATASOURCE_CREATED", "data_source", str(ds.id))
    return DataSourceOut.model_validate(ds)


@router.get("/{ds_id}", response_model=DataSourceOut)
def get_data_source(ds_id: int, db: Session = Depends(get_db), admin=Depends(require_admin)):
    ds = db.query(DataSource).filter(DataSource.id == ds_id).first()
    if not ds:
        raise HTTPException(status_code=404, detail="Data source not found")
    return DataSourceOut.model_validate(ds)


@router.put("/{ds_id}", response_model=DataSourceOut)
def update_data_source(ds_id: int, payload: DataSourceUpdate, db: Session = Depends(get_db), admin=Depends(require_admin)):
    ds = db.query(DataSource).filter(DataSource.id == ds_id).first()
    if not ds:
        raise HTTPException(status_code=404, detail="Data source not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        if field == "password" and value:
            ds.encrypted_password = encrypt_credential(value)
        elif hasattr(ds, field):
            setattr(ds, field, value)
    db.commit()
    db.refresh(ds)
    log_event(db, admin.id, admin.username, "DATASOURCE_UPDATED", "data_source", str(ds_id))
    return DataSourceOut.model_validate(ds)


@router.delete("/{ds_id}")
def delete_data_source(ds_id: int, db: Session = Depends(get_db), admin=Depends(require_admin)):
    ds = db.query(DataSource).filter(DataSource.id == ds_id).first()
    if not ds:
        raise HTTPException(status_code=404, detail="Data source not found")
    ds.is_active = False
    db.commit()
    log_event(db, admin.id, admin.username, "DATASOURCE_DELETED", "data_source", str(ds_id))
    return {"message": "Data source deactivated"}


@router.post("/{ds_id}/test", response_model=ConnectionTestResult)
def test_data_source(ds_id: int, db: Session = Depends(get_db), admin=Depends(require_admin)):
    ds = db.query(DataSource).filter(DataSource.id == ds_id).first()
    if not ds:
        raise HTTPException(status_code=404, detail="Data source not found")
    result = test_connection(ds)
    return ConnectionTestResult(**result)


@router.get("/{ds_id}/schemas")
def list_schemas(ds_id: int, db: Session = Depends(get_db), admin=Depends(require_admin)):
    ds = db.query(DataSource).filter(DataSource.id == ds_id).first()
    if not ds:
        raise HTTPException(status_code=404, detail="Data source not found")
    try:
        schemas = get_schemas(ds)
        return {"schemas": schemas}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/{ds_id}/tables")
def list_tables(ds_id: int, schema: Optional[str] = None, db: Session = Depends(get_db), admin=Depends(require_admin)):
    ds = db.query(DataSource).filter(DataSource.id == ds_id).first()
    if not ds:
        raise HTTPException(status_code=404, detail="Data source not found")
    try:
        tables = get_tables(ds, schema)
        return {"tables": tables}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/{ds_id}/columns")
def list_columns(ds_id: int, table: str, schema: Optional[str] = None, db: Session = Depends(get_db), admin=Depends(require_admin)):
    ds = db.query(DataSource).filter(DataSource.id == ds_id).first()
    if not ds:
        raise HTTPException(status_code=404, detail="Data source not found")
    try:
        cols = get_columns(ds, table, schema)
        return {"columns": cols}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))

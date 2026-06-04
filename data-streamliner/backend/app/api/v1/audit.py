from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from ...core.deps import get_db, require_admin
from ...models.audit import AuditLog
from ...schemas.audit import AuditLogOut, AuditLogList

router = APIRouter()


@router.get("/", response_model=AuditLogList)
def list_audit_logs(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, le=200),
    event_type: Optional[str] = None,
    object_type: Optional[str] = None,
    username: Optional[str] = None,
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    q = db.query(AuditLog).order_by(AuditLog.event_timestamp.desc())
    if event_type:
        q = q.filter(AuditLog.event_type == event_type)
    if object_type:
        q = q.filter(AuditLog.object_type == object_type)
    if username:
        q = q.filter(AuditLog.username.ilike(f"%{username}%"))
    total = q.count()
    items = q.offset((page - 1) * page_size).limit(page_size).all()
    return AuditLogList(
        items=[AuditLogOut.model_validate(i) for i in items],
        total=total,
        page=page,
        page_size=page_size,
    )

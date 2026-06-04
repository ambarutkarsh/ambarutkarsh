from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ...core.deps import get_db, get_current_user, require_report_creator
from ...models.dashboard import Dashboard, DashboardWidget, DashboardStatus
from ...schemas.dashboard import DashboardOut, DashboardCreate, DashboardUpdate
from ...services.audit_service import log_event

router = APIRouter()


@router.get("/", response_model=List[DashboardOut])
def list_dashboards(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return db.query(Dashboard).all()


@router.post("/", response_model=DashboardOut, status_code=status.HTTP_201_CREATED)
def create_dashboard(payload: DashboardCreate, db: Session = Depends(get_db), current_user=Depends(require_report_creator)):
    dash = Dashboard(
        name=payload.name,
        description=payload.description,
        layout=payload.layout,
        filters=payload.filters,
        allowed_roles=payload.allowed_roles,
        status=DashboardStatus.draft,
        created_by=current_user.id,
    )
    db.add(dash)
    db.flush()
    for w in payload.widgets:
        widget = DashboardWidget(dashboard_id=dash.id, **w.model_dump())
        db.add(widget)
    db.commit()
    db.refresh(dash)
    log_event(db, current_user.id, current_user.username, "DASHBOARD_CREATED", "dashboard", str(dash.id))
    return DashboardOut.model_validate(dash)


@router.get("/{dashboard_id}", response_model=DashboardOut)
def get_dashboard(dashboard_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    dash = db.query(Dashboard).filter(Dashboard.id == dashboard_id).first()
    if not dash:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    return DashboardOut.model_validate(dash)


@router.put("/{dashboard_id}", response_model=DashboardOut)
def update_dashboard(dashboard_id: int, payload: DashboardUpdate, db: Session = Depends(get_db), current_user=Depends(require_report_creator)):
    dash = db.query(Dashboard).filter(Dashboard.id == dashboard_id).first()
    if not dash:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    for k, v in payload.model_dump(exclude_unset=True, exclude={"widgets"}).items():
        setattr(dash, k, v)
    if payload.widgets is not None:
        for w in dash.widgets:
            db.delete(w)
        db.flush()
        for w in payload.widgets:
            widget = DashboardWidget(dashboard_id=dash.id, **w.model_dump())
            db.add(widget)
    db.commit()
    db.refresh(dash)
    log_event(db, current_user.id, current_user.username, "DASHBOARD_UPDATED", "dashboard", str(dashboard_id))
    return DashboardOut.model_validate(dash)


@router.delete("/{dashboard_id}")
def delete_dashboard(dashboard_id: int, db: Session = Depends(get_db), current_user=Depends(require_report_creator)):
    dash = db.query(Dashboard).filter(Dashboard.id == dashboard_id).first()
    if not dash:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    db.delete(dash)
    db.commit()
    log_event(db, current_user.id, current_user.username, "DASHBOARD_DELETED", "dashboard", str(dashboard_id))
    return {"message": "Dashboard deleted"}


@router.post("/{dashboard_id}/publish")
def publish_dashboard(dashboard_id: int, db: Session = Depends(get_db), current_user=Depends(require_report_creator)):
    dash = db.query(Dashboard).filter(Dashboard.id == dashboard_id).first()
    if not dash:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    dash.status = DashboardStatus.published
    db.commit()
    log_event(db, current_user.id, current_user.username, "DASHBOARD_PUBLISHED", "dashboard", str(dashboard_id))
    return {"message": "Dashboard published", "dashboard_id": dashboard_id}

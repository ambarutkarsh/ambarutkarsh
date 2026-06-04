import time
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ...core.deps import get_db, get_current_user, require_report_creator
from ...models.report import Report, ReportExecution, ExecutionStatus
from ...models.dataset import Dataset, DatasetField, FieldType, AggregationType
from ...models.data_source import DataSource
from ...schemas.report import ReportOut, ReportCreate, ReportUpdate, ReportExecuteRequest, QueryResult, ChartRecommendation
from ...services.query_engine import QueryEngine, recommend_charts
from ...services.audit_service import log_event

router = APIRouter()
query_engine = QueryEngine()


@router.get("/", response_model=List[ReportOut])
def list_reports(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    q = db.query(Report)
    if not current_user.is_superuser and "admin" not in (current_user.roles or []):
        user_roles = set(current_user.roles or [])
        q = q.filter(
            (Report.created_by == current_user.id)
            | (Report.is_public == True)
        )
    return q.all()


@router.post("/", response_model=ReportOut, status_code=status.HTTP_201_CREATED)
def create_report(payload: ReportCreate, db: Session = Depends(get_db), current_user=Depends(require_report_creator)):
    report = Report(
        name=payload.name,
        description=payload.description,
        dataset_id=payload.dataset_id,
        config=payload.config,
        is_public=payload.is_public,
        allowed_roles=payload.allowed_roles,
        created_by=current_user.id,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    log_event(db, current_user.id, current_user.username, "REPORT_CREATED", "report", str(report.id))
    return ReportOut.model_validate(report)


@router.get("/{report_id}", response_model=ReportOut)
def get_report(report_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return ReportOut.model_validate(report)


@router.put("/{report_id}", response_model=ReportOut)
def update_report(report_id: int, payload: ReportUpdate, db: Session = Depends(get_db), current_user=Depends(require_report_creator)):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(report, k, v)
    db.commit()
    db.refresh(report)
    log_event(db, current_user.id, current_user.username, "REPORT_UPDATED", "report", str(report_id))
    return ReportOut.model_validate(report)


@router.delete("/{report_id}")
def delete_report(report_id: int, db: Session = Depends(get_db), current_user=Depends(require_report_creator)):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    db.delete(report)
    db.commit()
    log_event(db, current_user.id, current_user.username, "REPORT_DELETED", "report", str(report_id))
    return {"message": "Report deleted"}


@router.post("/{report_id}/execute", response_model=QueryResult)
def execute_report(report_id: int, req: ReportExecuteRequest, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    dataset = db.query(Dataset).filter(Dataset.id == report.dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    data_source = db.query(DataSource).filter(DataSource.id == dataset.data_source_id).first()
    if not data_source:
        raise HTTPException(status_code=404, detail="Data source not found")

    config = report.config or {}
    selected_fields = config.get("selected_fields", [f.source_column for f in dataset.fields if f.is_visible])
    filters = {**(config.get("filters", {})), **(req.filters or {})}

    exec_record = ReportExecution(
        report_id=report.id,
        executed_by=current_user.id,
        filters_applied=filters,
        status=ExecutionStatus.success,
    )

    try:
        start = time.time()
        result = query_engine.execute(
            dataset=dataset,
            data_source=data_source,
            selected_field_names=selected_fields,
            filters=filters,
            limit=req.limit,
        )
        exec_record.execution_time_ms = int((time.time() - start) * 1000)
        exec_record.row_count = result.row_count
        exec_record.status = ExecutionStatus.success
    except Exception as exc:
        exec_record.status = ExecutionStatus.failed
        exec_record.error_message = str(exc)
        db.add(exec_record)
        db.commit()
        raise HTTPException(status_code=400, detail=str(exc))

    db.add(exec_record)
    db.commit()

    return QueryResult(
        columns=result.columns,
        rows=result.rows,
        row_count=result.row_count,
        execution_time_ms=result.execution_time_ms,
        truncated=result.truncated,
    )


@router.get("/{report_id}/chart-recommendations", response_model=ChartRecommendation)
def chart_recommendations(report_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    dataset = db.query(Dataset).filter(Dataset.id == report.dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    config = report.config or {}
    selected_field_names = config.get("selected_fields", [])
    field_map = {f.source_column: f for f in dataset.fields}

    selected_fields = [field_map[n] for n in selected_field_names if n in field_map]
    measures = [f for f in selected_fields if f.aggregation_type != AggregationType.none]
    dimensions = [f for f in selected_fields if f.aggregation_type == AggregationType.none and f.field_type == FieldType.dimension]

    result = recommend_charts(measures, dimensions)
    return ChartRecommendation(**result)

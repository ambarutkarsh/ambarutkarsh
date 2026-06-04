from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
from pydantic import BaseModel
from ...core.deps import get_db, get_current_user
from ...models.report import Report
from ...models.dataset import Dataset
from ...models.data_source import DataSource
from ...services.query_engine import QueryEngine
from ...services.export_service import export_csv, export_xlsx, get_export_filename
from ...core.config import settings

router = APIRouter()
query_engine = QueryEngine()


class ExportRequest(BaseModel):
    report_id: int
    format: str  # "csv" or "xlsx"
    filters: Optional[Dict[str, Any]] = None


@router.post("/")
def export_report(req: ExportRequest, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    if req.format not in ("csv", "xlsx"):
        raise HTTPException(status_code=400, detail="Format must be 'csv' or 'xlsx'")

    report = db.query(Report).filter(Report.id == req.report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    dataset = db.query(Dataset).filter(Dataset.id == report.dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    data_source = db.query(DataSource).filter(DataSource.id == dataset.data_source_id).first()
    if not data_source:
        raise HTTPException(status_code=404, detail="Data source not found")

    config = report.config or {}
    selected_fields = config.get("selected_fields", [f.source_column for f in dataset.fields if f.is_visible and f.is_exportable])
    filters = {**(config.get("filters", {})), **(req.filters or {})}

    try:
        result = query_engine.execute(
            dataset=dataset,
            data_source=data_source,
            selected_field_names=selected_fields,
            filters=filters,
            limit=settings.MAX_EXPORT_ROWS,
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    exportable_fields = [f for f in dataset.fields if f.source_column in selected_fields or f.business_name in selected_fields]
    filename = get_export_filename(report.name, req.format)

    if req.format == "csv":
        content = export_csv(result.rows, result.columns, exportable_fields, current_user, report.name)
        media_type = "text/csv"
    else:
        content = export_xlsx(result.rows, result.columns, exportable_fields, current_user, report.name)
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

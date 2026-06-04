import io
import csv
from typing import List, Dict, Any, Optional
from datetime import datetime
import pandas as pd
from ..models.dataset import DatasetField
from ..models.user import User


def _mask_pii_columns(
    rows: List[Dict[str, Any]],
    fields: List[DatasetField],
    user: User,
) -> List[Dict[str, Any]]:
    """Mask PII columns unless user has admin role."""
    user_roles = set(user.roles or [])
    can_see_pii = user.is_superuser or bool(user_roles & {"admin", "data_admin"})
    if can_see_pii:
        return rows

    pii_business_names = {f.business_name for f in fields if f.is_pii}
    if not pii_business_names:
        return rows

    masked = []
    for row in rows:
        new_row = dict(row)
        for col in pii_business_names:
            if col in new_row and new_row[col] is not None:
                val = str(new_row[col])
                new_row[col] = val[:2] + "****" if len(val) > 2 else "****"
        masked.append(new_row)
    return masked


def export_csv(
    rows: List[Dict[str, Any]],
    columns: List[str],
    fields: List[DatasetField],
    user: User,
    report_name: str,
) -> bytes:
    """Export data to CSV bytes."""
    rows = _mask_pii_columns(rows, fields, user)
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=columns, extrasaction="ignore")
    writer.writeheader()
    writer.writerows(rows)
    return output.getvalue().encode("utf-8-sig")  # BOM for Excel compatibility


def export_xlsx(
    rows: List[Dict[str, Any]],
    columns: List[str],
    fields: List[DatasetField],
    user: User,
    report_name: str,
) -> bytes:
    """Export data to XLSX bytes using openpyxl via pandas."""
    rows = _mask_pii_columns(rows, fields, user)
    df = pd.DataFrame(rows, columns=columns)

    # Apply formatting hints
    field_map = {f.business_name: f for f in fields}
    for col in columns:
        f = field_map.get(col)
        if f and f.data_type in ("decimal",) and col in df.columns:
            try:
                df[col] = pd.to_numeric(df[col], errors="coerce")
            except Exception:
                pass

    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Data")
        ws = writer.sheets["Data"]
        # Auto-size columns
        for col_idx, col_name in enumerate(df.columns, 1):
            max_len = max(len(str(col_name)), df[col_name].astype(str).str.len().max() if len(df) > 0 else 0)
            ws.column_dimensions[ws.cell(1, col_idx).column_letter].width = min(max_len + 2, 50)
    return output.getvalue()


def get_export_filename(report_name: str, fmt: str) -> str:
    ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    safe_name = "".join(c if c.isalnum() or c in ("-", "_") else "_" for c in report_name)
    return f"{safe_name}_{ts}.{fmt}"

import structlog
from typing import Optional, Any, Dict
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from ..models.audit import AuditLog

logger = structlog.get_logger()


def log_event(
    db: Session,
    user_id: Optional[int],
    username: Optional[str],
    event_type: str,
    object_type: Optional[str] = None,
    object_id: Optional[str] = None,
    previous_value: Optional[Dict[str, Any]] = None,
    new_value: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None,
    status: str = "success",
    description: Optional[str] = None,
) -> None:
    """Log an audit event. Never raises exceptions."""
    try:
        entry = AuditLog(
            event_timestamp=datetime.now(timezone.utc),
            user_id=user_id,
            username=username,
            event_type=event_type,
            object_type=object_type,
            object_id=str(object_id) if object_id is not None else None,
            previous_value=previous_value,
            new_value=new_value,
            ip_address=ip_address,
            status=status,
            description=description,
        )
        db.add(entry)
        db.commit()
    except Exception as exc:
        logger.warning("audit_log_failed", error=str(exc))

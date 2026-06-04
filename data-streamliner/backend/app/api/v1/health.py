from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime, timezone
from ...core.deps import get_db
from ...core.config import settings

router = APIRouter()


@router.get("/")
def health_check(db: Session = Depends(get_db)):
    db_connected = False
    try:
        db.execute(text("SELECT 1"))
        db_connected = True
    except Exception:
        pass
    return {
        "status": "healthy" if db_connected else "degraded",
        "version": settings.APP_VERSION,
        "db_connected": db_connected,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

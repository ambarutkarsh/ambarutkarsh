from typing import Generator
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import structlog

from app.core.database import SessionLocal
from app.core.security import verify_token
from app.models.user import User

logger = structlog.get_logger()

security = HTTPBearer()


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    token = credentials.credentials
    payload = verify_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is disabled")
    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_superuser and "admin" not in (current_user.roles or []):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin role required")
    return current_user


def require_data_admin(current_user: User = Depends(get_current_user)) -> User:
    allowed = {"admin", "data_admin"}
    user_roles = set(current_user.roles or [])
    if not current_user.is_superuser and not user_roles.intersection(allowed):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Data admin role required")
    return current_user


def require_report_creator(current_user: User = Depends(get_current_user)) -> User:
    allowed = {"admin", "data_admin", "report_creator"}
    user_roles = set(current_user.roles or [])
    if not current_user.is_superuser and not user_roles.intersection(allowed):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Report creator role required")
    return current_user


def require_auditor(current_user: User = Depends(get_current_user)) -> User:
    allowed = {"admin", "auditor"}
    user_roles = set(current_user.roles or [])
    if not current_user.is_superuser and not user_roles.intersection(allowed):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Auditor role required")
    return current_user

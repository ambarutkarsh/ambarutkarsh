import structlog
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .core.config import settings
from .core.database import create_all_tables, SessionLocal
from .core.security import hash_password
from .api.router import api_router

# Configure structlog
structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.stdlib.add_log_level,
        structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
)

logging.basicConfig(level=getattr(logging, settings.LOG_LEVEL, logging.INFO))
logger = structlog.get_logger()


def create_default_admin():
    """Create default admin user if no users exist."""
    from .models.user import User
    db = SessionLocal()
    try:
        count = db.query(User).count()
        if count == 0:
            admin = User(
                email="admin@starhealth.in",
                username="admin",
                hashed_password=hash_password("Admin@123"),
                full_name="System Administrator",
                is_active=True,
                is_superuser=True,
                roles=["admin"],
                force_password_change=True,
            )
            db.add(admin)
            db.commit()
            logger.info("default_admin_created", username="admin")
    except Exception as exc:
        logger.warning("default_admin_creation_failed", error=str(exc))
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("startup", app=settings.APP_NAME, env=settings.APP_ENV)
    create_all_tables()
    create_default_admin()
    yield
    logger.info("shutdown")


app = FastAPI(
    title=settings.APP_NAME,
    description="Star Health Insurance - Renewal Analytics Platform",
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://frontend:3000", "http://localhost:80"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("unhandled_exception", path=str(request.url), error=str(exc))
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})

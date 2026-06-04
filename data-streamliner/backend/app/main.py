import structlog
import logging
import os
import threading
import webbrowser
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from .core.config import settings
from .core.database import create_all_tables, SessionLocal
from .core.security import hash_password
from .api.router import api_router

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


def _open_browser():
    url = f"http://localhost:{settings.APP_PORT}"
    webbrowser.open(url)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("startup", app=settings.APP_NAME, env=settings.APP_ENV, desktop=settings.DESKTOP_MODE)
    create_all_tables()
    create_default_admin()
    if settings.DESKTOP_MODE:
        # Delay slightly so the server is ready before the browser opens
        threading.Timer(1.5, _open_browser).start()
    yield
    logger.info("shutdown")


app = FastAPI(
    title=settings.APP_NAME,
    description="Star Health Insurance - Renewal Analytics Platform",
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8000", "http://frontend:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("unhandled_exception", path=str(request.url), error=str(exc))
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


# Serve bundled React frontend in desktop mode
# Must be mounted AFTER API routes so /api/* is not caught by the static handler
_static_dir = os.path.join(os.path.dirname(__file__), "..", "static")
if os.path.isdir(_static_dir):
    app.mount("/", StaticFiles(directory=_static_dir, html=True), name="frontend")

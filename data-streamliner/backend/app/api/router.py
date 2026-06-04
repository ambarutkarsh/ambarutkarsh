from fastapi import APIRouter
from .v1 import auth, users, data_sources, datasets, semantic, reports, dashboards, query, export, audit, health

api_router = APIRouter()

api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(data_sources.router, prefix="/data-sources", tags=["data-sources"])
api_router.include_router(datasets.router, prefix="/datasets", tags=["datasets"])
api_router.include_router(semantic.router, prefix="/semantic", tags=["semantic"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
api_router.include_router(dashboards.router, prefix="/dashboards", tags=["dashboards"])
api_router.include_router(query.router, prefix="/query", tags=["query"])
api_router.include_router(export.router, prefix="/export", tags=["export"])
api_router.include_router(audit.router, prefix="/audit", tags=["audit"])

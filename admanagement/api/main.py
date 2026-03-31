from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from admanagement.api.routes.activity import router as activity_router
from admanagement.api.routes.configuration import router as configuration_router
from admanagement.api.routes.dashboard import router as dashboard_router
from admanagement.api.routes.health import router as health_router
from admanagement.api.routes.logons import router as logons_router
from admanagement.api.routes.reports import router as reports_router
from admanagement.api.routes.snapshots import router as snapshots_router
from admanagement.api.routes.setup import router as setup_router
from admanagement.api.routes.web import router as web_router
from admanagement.core.config import get_settings
from admanagement.db.bootstrap import init_db
from admanagement.services.scheduler import CollectorScheduler


settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    scheduler = CollectorScheduler(settings)
    app.state.collector_scheduler = scheduler
    if settings.scheduler_enabled:
        scheduler.start()
    try:
        yield
    finally:
        scheduler.shutdown()


app = FastAPI(
    title=settings.app_name,
    debug=settings.debug,
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.frontend_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(web_router)
app.include_router(health_router, prefix="/api")
app.include_router(activity_router, prefix="/api")
app.include_router(configuration_router, prefix="/api")
app.include_router(logons_router, prefix="/api")
app.include_router(snapshots_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")
app.include_router(reports_router, prefix="/api")
app.include_router(setup_router, prefix="/api")

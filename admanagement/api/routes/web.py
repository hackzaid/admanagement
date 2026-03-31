from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

from admanagement.core.config import get_settings
from admanagement.services.dashboard import DashboardService


templates = Jinja2Templates(directory=str(Path(__file__).resolve().parents[2] / "templates"))
router = APIRouter(tags=["web"])


@router.get("/", response_class=HTMLResponse)
def dashboard_page(request: Request) -> HTMLResponse:
    settings = get_settings()
    payload = DashboardService(settings).build_overview()
    scheduler = getattr(request.app.state, "collector_scheduler", None)
    return templates.TemplateResponse(
        "dashboard.html",
        {
            "request": request,
            "app_name": settings.app_name,
            "environment": settings.environment,
            "snapshot_summary": payload["snapshot_summary"],
            "activity_summary": payload["activity_summary"],
            "recent_activity": payload["recent_activity"],
            "scheduler": scheduler.status() if scheduler else {"enabled": False, "running": False, "jobs": []},
        },
    )

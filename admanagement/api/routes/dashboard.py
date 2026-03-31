from __future__ import annotations

from fastapi import APIRouter, Query, Request

from admanagement.core.config import get_settings
from admanagement.services.dashboard import DashboardService


router = APIRouter(tags=["dashboard"])


@router.get("/dashboard")
def dashboard_summary(
    request: Request,
    start_time_utc: str | None = Query(None),
    end_time_utc: str | None = Query(None),
) -> dict[str, object]:
    settings = get_settings()
    payload = DashboardService(settings).build_overview(
        start_time_utc=start_time_utc,
        end_time_utc=end_time_utc,
    )
    scheduler = getattr(request.app.state, "collector_scheduler", None)
    payload["scheduler"] = scheduler.status() if scheduler else {"enabled": False, "running": False, "jobs": []}
    return payload


@router.post("/dashboard/run-now")
def dashboard_run_now(
    request: Request,
    include_snapshot: bool = Query(False),
) -> dict[str, object]:
    scheduler = getattr(request.app.state, "collector_scheduler", None)
    if scheduler is None:
        return {
            "triggered_at_utc": None,
            "include_snapshot": include_snapshot,
            "results": {},
            "error": "Collector scheduler is not available.",
        }

    return scheduler.run_now(include_snapshot=include_snapshot)

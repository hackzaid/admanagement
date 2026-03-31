from __future__ import annotations

from fastapi import APIRouter, Query, Request

from admanagement import __version__
from admanagement.core.config import get_settings


router = APIRouter(tags=["system"])


@router.get("/system/version")
def system_version() -> dict[str, str]:
    return {"version": __version__}


@router.get("/system/update-status")
def system_update_status(
    request: Request,
    refresh: bool = Query(False),
) -> dict[str, object]:
    update_monitor = getattr(request.app.state, "update_monitor", None)
    if update_monitor is None:
        return {
            "status": "disabled",
            "current_version": __version__,
            "update_available": False,
            "error": "Update monitor is not available.",
        }

    cached = update_monitor.get_status()
    if refresh or cached.get("status") == "unknown":
        return update_monitor.refresh()
    return cached


@router.get("/system/overview")
def system_overview(
    request: Request,
    refresh: bool = Query(False),
) -> dict[str, object]:
    settings = get_settings()
    update_monitor = getattr(request.app.state, "update_monitor", None)
    update_applier = getattr(request.app.state, "update_applier", None)
    scheduler = getattr(request.app.state, "collector_scheduler", None)

    if update_monitor is None:
        update_status: dict[str, object] = {
            "status": "disabled",
            "current_version": __version__,
            "update_available": False,
            "error": "Update monitor is not available.",
        }
    else:
        cached = update_monitor.get_status()
        update_status = update_monitor.refresh() if refresh or cached.get("status") == "unknown" else cached

    return {
        "health": {
            "status": "ok",
            "app": settings.app_name,
            "environment": settings.environment,
            "version": __version__,
        },
        "deployment": {
            "repository": settings.update_repository,
            "channel": settings.update_channel,
            "branch": settings.update_branch,
            "deploy_mode": settings.update_deploy_mode,
            "scheduler_enabled": settings.scheduler_enabled,
        },
        "scheduler": scheduler.status() if scheduler else {"enabled": False, "running": False, "jobs": []},
        "update_status": update_status,
        "update_apply": update_applier.status() if update_applier else {"enabled": False, "state": "unavailable"},
    }


@router.post("/system/apply-update")
def system_apply_update(request: Request) -> dict[str, object]:
    update_applier = getattr(request.app.state, "update_applier", None)
    if update_applier is None:
        return {
            "enabled": False,
            "state": "unavailable",
            "last_error": "Update apply service is not available.",
        }
    return update_applier.apply()

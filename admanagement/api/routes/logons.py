from __future__ import annotations

from fastapi import APIRouter, Query
from fastapi.responses import PlainTextResponse

from admanagement.collectors.logon_ingestor import LogonIngestor
from admanagement.core.config import get_settings


router = APIRouter(prefix="/logons", tags=["logons"])


@router.get("/summary")
def logon_summary(limit: int = Query(10, ge=1, le=100)) -> dict[str, object]:
    settings = get_settings()
    return LogonIngestor(settings).summary(limit=limit)


@router.get("/query")
def query_logons(
    limit: int = Query(50, ge=1, le=5000),
    offset: int = Query(0, ge=0),
    actor: str | None = None,
    domain_controller: str | None = None,
    event_type: str | None = Query(None, pattern="^(Logon|Logoff|LogonFailure|AccountLockout)$"),
    event_types: list[str] | None = Query(None),
    search: str | None = None,
    start_time_utc: str | None = None,
    end_time_utc: str | None = None,
) -> dict[str, object]:
    settings = get_settings()
    return LogonIngestor(settings).query(
        limit=limit,
        offset=offset,
        actor=actor,
        domain_controller=domain_controller,
        event_type=event_type,
        event_types=event_types,
        search=search,
        start_time_utc=start_time_utc,
        end_time_utc=end_time_utc,
    )


@router.get("/export.csv", response_class=PlainTextResponse)
def export_logons_csv(
    actor: str | None = None,
    domain_controller: str | None = None,
    event_type: str | None = Query(None, pattern="^(Logon|Logoff|LogonFailure|AccountLockout)$"),
    event_types: list[str] | None = Query(None),
    search: str | None = None,
    start_time_utc: str | None = None,
    end_time_utc: str | None = None,
    limit: int = Query(5000, ge=1, le=20000),
) -> str:
    settings = get_settings()
    return LogonIngestor(settings).export_csv(
        actor=actor,
        domain_controller=domain_controller,
        event_type=event_type,
        event_types=event_types,
        search=search,
        start_time_utc=start_time_utc,
        end_time_utc=end_time_utc,
        limit=limit,
    )


@router.post("/poll")
def poll_logons(
    window_minutes: int | None = Query(None, ge=1, le=1440),
    ignore_checkpoints: bool = Query(False),
) -> dict[str, object]:
    settings = get_settings()
    return LogonIngestor(settings).run(
        window_minutes_override=window_minutes,
        ignore_checkpoints=ignore_checkpoints,
    )

from __future__ import annotations

from fastapi import APIRouter, Query
from fastapi.responses import PlainTextResponse

from admanagement.collectors.event_ingestor import EventIngestor
from admanagement.core.config import get_settings


router = APIRouter(prefix="/activity", tags=["activity"])


@router.get("/summary")
def activity_summary(limit: int = Query(10, ge=1, le=100)) -> dict[str, object]:
    settings = get_settings()
    return EventIngestor(settings).summary(limit=limit)


@router.get("/recent")
def recent_activity(limit: int = Query(20, ge=1, le=200)) -> list[dict[str, object]]:
    settings = get_settings()
    return EventIngestor(settings).analysis.recent_activity(limit=limit)


@router.get("/query")
def query_activity(
    limit: int = Query(50, ge=1, le=5000),
    offset: int = Query(0, ge=0),
    actor: str | None = None,
    action: str | None = None,
    target_type: str | None = None,
    domain_controller: str | None = None,
    report_key: str | None = None,
    search: str | None = None,
    start_time_utc: str | None = None,
    end_time_utc: str | None = None,
) -> dict[str, object]:
    settings = get_settings()
    return EventIngestor(settings).analysis.query_activity(
        limit=limit,
        offset=offset,
        actor=actor,
        action=action,
        target_type=target_type,
        domain_controller=domain_controller,
        report_key=report_key,
        search=search,
        start_time_utc=start_time_utc,
        end_time_utc=end_time_utc,
    )


@router.get("/export.csv", response_class=PlainTextResponse)
def export_activity_csv(
    actor: str | None = None,
    action: str | None = None,
    target_type: str | None = None,
    domain_controller: str | None = None,
    report_key: str | None = None,
    search: str | None = None,
    start_time_utc: str | None = None,
    end_time_utc: str | None = None,
    limit: int = Query(5000, ge=1, le=20000),
) -> str:
    settings = get_settings()
    return EventIngestor(settings).analysis.export_activity_csv(
        actor=actor,
        action=action,
        target_type=target_type,
        domain_controller=domain_controller,
        report_key=report_key,
        search=search,
        start_time_utc=start_time_utc,
        end_time_utc=end_time_utc,
        limit=limit,
    )


@router.get("/actors")
def actor_summary(limit: int = Query(20, ge=1, le=200)) -> list[dict[str, object]]:
    settings = get_settings()
    return EventIngestor(settings).analysis.query_actor_summary(limit=limit)


@router.get("/domain-controllers")
def dc_summary(limit: int = Query(20, ge=1, le=200)) -> list[dict[str, object]]:
    settings = get_settings()
    return EventIngestor(settings).analysis.query_domain_controller_summary(limit=limit)


@router.post("/poll")
def poll_activity(
    window_minutes: int | None = Query(None, ge=1, le=1440),
    ignore_checkpoints: bool = Query(False),
    skip_origin_correlation: bool = Query(False),
) -> dict[str, object]:
    settings = get_settings()
    return EventIngestor(settings).run(
        window_minutes_override=window_minutes,
        ignore_checkpoints=ignore_checkpoints,
        skip_origin_correlation=skip_origin_correlation,
    )

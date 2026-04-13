from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select

from admanagement.core.config import Settings
from admanagement.db.bootstrap import init_db
from admanagement.db.session import SessionLocal
from admanagement.models.checkpoint import EventCheckpoint
from admanagement.services.runtime_config import RuntimeConfigService


def _normalize_sources(values: list[str]) -> list[str]:
    seen: set[str] = set()
    normalized: list[str] = []
    for item in values:
        value = str(item).strip()
        if not value or value in seen:
            continue
        seen.add(value)
        normalized.append(value)
    return normalized


def _build_health_payload(
    *,
    checkpoint_type: str,
    expected_sources: list[str],
    poll_interval_minutes: int,
    scope_warning: str | None = None,
) -> dict[str, Any]:
    init_db()
    now = datetime.now(timezone.utc)
    threshold_minutes = max(poll_interval_minutes * 3, 20)
    expected = _normalize_sources(expected_sources)

    with SessionLocal() as session:
        rows = session.execute(
            select(EventCheckpoint).where(EventCheckpoint.checkpoint_type == checkpoint_type)
        ).scalars().all()

    checkpoints = {row.source_name: row for row in rows}
    source_statuses: list[dict[str, Any]] = []
    missing_sources: list[str] = []
    stale_sources: list[str] = []
    healthy_sources: list[str] = []
    latest_checkpoint_time: datetime | None = None

    for source in expected:
        row = checkpoints.get(source)
        checkpoint_time = row.last_activity_time_utc if row else None
        if checkpoint_time is not None:
            checkpoint_time = checkpoint_time.astimezone(timezone.utc)
        updated_time = row.updated_at_utc.astimezone(timezone.utc) if row and row.updated_at_utc else None
        reference_time = checkpoint_time or updated_time
        age_minutes = (
            int((now - reference_time).total_seconds() // 60)
            if reference_time is not None
            else None
        )
        is_stale = reference_time is None or (age_minutes is not None and age_minutes > threshold_minutes)
        if reference_time is None:
            missing_sources.append(source)
        elif is_stale:
            stale_sources.append(source)
        else:
            healthy_sources.append(source)

        if reference_time and (latest_checkpoint_time is None or reference_time > latest_checkpoint_time):
            latest_checkpoint_time = reference_time

        source_statuses.append(
            {
                "source": source,
                "last_checkpoint_time_utc": reference_time.isoformat() if reference_time else None,
                "age_minutes": age_minutes,
                "stale": bool(is_stale),
            }
        )

    if not expected:
        status = "unconfigured"
        message = "No collector hosts are configured for this data source yet."
    elif missing_sources:
        status = "stale"
        message = (
            f"Collection is incomplete. No checkpoint has been recorded yet for {len(missing_sources)} "
            f"configured host{'s' if len(missing_sources) != 1 else ''}."
        )
    elif stale_sources:
        status = "stale"
        message = (
            f"Collection is stale on {len(stale_sources)} configured host"
            f"{'s' if len(stale_sources) != 1 else ''}. Latest checkpoint is older than {threshold_minutes} minutes."
        )
    else:
        status = "healthy"
        message = (
            f"Collection is healthy across {len(healthy_sources)} configured host"
            f"{'s' if len(healthy_sources) != 1 else ''}."
        )

    return {
        "status": status,
        "message": message,
        "threshold_minutes": threshold_minutes,
        "expected_sources": expected,
        "healthy_sources": healthy_sources,
        "missing_sources": missing_sources,
        "stale_sources": stale_sources,
        "latest_checkpoint_time_utc": latest_checkpoint_time.isoformat() if latest_checkpoint_time else None,
        "source_statuses": source_statuses,
        "scope_warning": scope_warning,
    }


def build_activity_collector_health(settings: Settings) -> dict[str, Any]:
    effective = RuntimeConfigService(settings).effective_runtime()
    return _build_health_payload(
        checkpoint_type="activity_winrm",
        expected_sources=list(effective["event_dc_list"]),
        poll_interval_minutes=settings.activity_poll_interval_minutes,
    )


def build_logon_collector_health(settings: Settings) -> dict[str, Any]:
    effective = RuntimeConfigService(settings).effective_runtime()
    event_dc_list = _normalize_sources(list(effective["event_dc_list"]))
    logon_source_hosts = _normalize_sources(list(effective["logon_source_hosts"]))
    scope_warning = None
    if logon_source_hosts and set(logon_source_hosts).issubset(set(event_dc_list)):
        scope_warning = (
            "Logon and RDP evidence is currently being collected only from domain controllers. "
            "Add member servers and jump hosts under Logon Source Hosts for target-host visibility."
        )
    return _build_health_payload(
        checkpoint_type="logon_winrm",
        expected_sources=logon_source_hosts,
        poll_interval_minutes=settings.logon_poll_interval_minutes,
        scope_warning=scope_warning,
    )

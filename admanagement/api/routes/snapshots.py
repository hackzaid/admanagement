from __future__ import annotations

from fastapi import APIRouter, Query

from admanagement.collectors.ldap_collector import LdapCollector
from admanagement.core.config import get_settings
from admanagement.services.snapshot_analysis import SnapshotAnalysisService


router = APIRouter(prefix="/snapshots", tags=["snapshots"])


@router.get("/runs")
def snapshot_runs(limit: int = Query(10, ge=1, le=100)) -> list[dict[str, object]]:
    return SnapshotAnalysisService().list_runs(limit=limit)


@router.get("/summary")
def snapshot_summary(run_id: str | None = None, stale_days: int = Query(180, ge=1, le=3650)) -> dict[str, object]:
    return SnapshotAnalysisService().summarize_run(run_id=run_id, stale_days=stale_days)


@router.get("/drift")
def snapshot_drift(
    baseline_run_id: str,
    target_run_id: str | None = None,
    stale_days: int = Query(180, ge=1, le=3650),
) -> dict[str, object]:
    return SnapshotAnalysisService().compare_runs(
        baseline_run_id=baseline_run_id,
        target_run_id=target_run_id,
        stale_days=stale_days,
    )


@router.post("/collect")
def collect_snapshot() -> dict[str, object]:
    settings = get_settings()
    return LdapCollector(settings).run_snapshot()

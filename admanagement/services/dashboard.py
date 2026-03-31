from __future__ import annotations

from typing import Any

from admanagement.core.config import Settings
from admanagement.services.activity_analysis import ActivityAnalysisService
from admanagement.services.logon_analysis import LogonAnalysisService
from admanagement.services.snapshot_analysis import SnapshotAnalysisService


class DashboardService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.snapshot_service = SnapshotAnalysisService()
        self.activity_service = ActivityAnalysisService(settings)
        self.logon_service = LogonAnalysisService()

    def build_overview(
        self,
        *,
        start_time_utc: str | None = None,
        end_time_utc: str | None = None,
    ) -> dict[str, Any]:
        latest_run_id = self.snapshot_service.latest_run_id()
        snapshot_summary = self.snapshot_service.summarize_run(run_id=latest_run_id) if latest_run_id else {"run_id": None}
        activity_summary = self.activity_service.summarize_filtered(
            limit=self.settings.dashboard_recent_activity_limit,
            start_time_utc=start_time_utc,
            end_time_utc=end_time_utc,
        )
        recent_activity = self.activity_service.recent_activity(
            limit=self.settings.dashboard_recent_activity_limit,
            start_time_utc=start_time_utc,
            end_time_utc=end_time_utc,
        )
        logon_summary = self.logon_service.summarize_filtered(
            limit=self.settings.dashboard_recent_activity_limit,
            start_time_utc=start_time_utc,
            end_time_utc=end_time_utc,
        )

        return {
            "snapshot_summary": snapshot_summary,
            "activity_summary": activity_summary,
            "logon_summary": logon_summary,
            "recent_activity": recent_activity,
            "filters": {
                "start_time_utc": start_time_utc,
                "end_time_utc": end_time_utc,
            },
        }

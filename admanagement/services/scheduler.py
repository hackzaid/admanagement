from __future__ import annotations

import logging
from datetime import datetime, timezone
from threading import Lock
from time import monotonic
from typing import Any

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

from admanagement.collectors.event_ingestor import EventIngestor
from admanagement.collectors.ldap_collector import LdapCollector
from admanagement.collectors.logon_ingestor import LogonIngestor
from admanagement.core.config import Settings
from admanagement.services.update_monitor import UpdateMonitor


logger = logging.getLogger(__name__)


class CollectorScheduler:
    def __init__(self, settings: Settings, update_monitor: UpdateMonitor | None = None) -> None:
        self.settings = settings
        self.update_monitor = update_monitor
        self._scheduler = BackgroundScheduler(timezone=timezone.utc)
        self._lock = Lock()
        self._job_locks = {
            "ldap_snapshot": Lock(),
            "activity_poll": Lock(),
            "logon_poll": Lock(),
            "update_check": Lock(),
        }
        self._latest_results: dict[str, dict[str, Any]] = {}

    def start(self) -> None:
        if self._scheduler.running:
            return

        self._scheduler.add_job(
            self._run_ldap_snapshot,
            trigger=IntervalTrigger(minutes=self.settings.ldap_snapshot_interval_minutes),
            id="ldap_snapshot",
            replace_existing=True,
            max_instances=1,
            coalesce=True,
            next_run_time=datetime.now(timezone.utc),
        )
        self._scheduler.add_job(
            self._run_activity_poll,
            trigger=IntervalTrigger(minutes=self.settings.activity_poll_interval_minutes),
            id="activity_poll",
            replace_existing=True,
            max_instances=1,
            coalesce=True,
            next_run_time=datetime.now(timezone.utc),
        )
        self._scheduler.add_job(
            self._run_logon_poll,
            trigger=IntervalTrigger(minutes=self.settings.logon_poll_interval_minutes),
            id="logon_poll",
            replace_existing=True,
            max_instances=1,
            coalesce=True,
            next_run_time=datetime.now(timezone.utc),
        )
        if self.settings.update_check_enabled and self.update_monitor is not None:
            self._scheduler.add_job(
                self._run_update_check,
                trigger=IntervalTrigger(minutes=self.settings.update_check_interval_minutes),
                id="update_check",
                replace_existing=True,
                max_instances=1,
                coalesce=True,
                next_run_time=datetime.now(timezone.utc),
            )
        self._scheduler.start()

    def shutdown(self) -> None:
        if self._scheduler.running:
            self._scheduler.shutdown(wait=False)

    def status(self) -> dict[str, Any]:
        jobs: list[dict[str, Any]] = []
        for job in self._scheduler.get_jobs():
            jobs.append(
                {
                    "id": job.id,
                    "next_run_time_utc": job.next_run_time.astimezone(timezone.utc).isoformat() if job.next_run_time else None,
                    "trigger": str(job.trigger),
                    "last_result": self._latest_results.get(job.id),
                }
            )

        return {
            "enabled": self.settings.scheduler_enabled,
            "running": self._scheduler.running,
            "jobs": jobs,
        }

    def run_now(self, *, include_snapshot: bool = False) -> dict[str, Any]:
        triggered_at = datetime.now(timezone.utc).isoformat()
        results: dict[str, dict[str, Any]] = {}
        results["activity_poll"] = self._run_job("activity_poll", self._execute_activity_poll)
        results["logon_poll"] = self._run_job("logon_poll", self._execute_logon_poll)
        if include_snapshot:
            results["ldap_snapshot"] = self._run_job("ldap_snapshot", self._execute_ldap_snapshot)

        return {
            "triggered_at_utc": triggered_at,
            "include_snapshot": include_snapshot,
            "results": results,
        }

    def _run_ldap_snapshot(self) -> dict[str, Any]:
        return self._run_job("ldap_snapshot", self._execute_ldap_snapshot)

    def _run_activity_poll(self) -> dict[str, Any]:
        return self._run_job("activity_poll", self._execute_activity_poll)

    def _run_logon_poll(self) -> dict[str, Any]:
        return self._run_job("logon_poll", self._execute_logon_poll)

    def _run_update_check(self) -> dict[str, Any]:
        return self._run_job("update_check", self._execute_update_check)

    def _run_job(self, job_id: str, executor: Any) -> dict[str, Any]:
        job_lock = self._job_locks[job_id]
        if not job_lock.acquire(blocking=False):
            result = {
                "status": "skipped",
                "reason": "Previous run is still active.",
                "timestamp_utc": datetime.now(timezone.utc).isoformat(),
            }
            self._store_result(job_id, result)
            logger.warning("Collector job %s skipped because a previous run is still active", job_id)
            return result

        started_at = datetime.now(timezone.utc)
        started_monotonic = monotonic()
        logger.info("Collector job %s started", job_id)
        try:
            result = executor()
            result.setdefault("status", "error" if result.get("error") else "completed")
            return result
        finally:
            duration_seconds = round(monotonic() - started_monotonic, 3)
            logger.info("Collector job %s finished in %.3fs", job_id, duration_seconds)
            with self._lock:
                latest = self._latest_results.get(job_id)
                if latest is not None:
                    latest.setdefault("started_at_utc", started_at.isoformat())
                    latest["duration_seconds"] = duration_seconds
            job_lock.release()

    def _execute_ldap_snapshot(self) -> dict[str, Any]:
        try:
            result = LdapCollector(self.settings).run_snapshot()
            self._store_result("ldap_snapshot", result)
        except Exception as exc:
            logger.exception("Scheduled LDAP snapshot failed")
            result = {"error": str(exc), "timestamp_utc": datetime.now(timezone.utc).isoformat()}
            self._store_result("ldap_snapshot", result)
        return result

    def _execute_activity_poll(self) -> dict[str, Any]:
        try:
            result = EventIngestor(self.settings).run(
                skip_origin_correlation=self.settings.event_skip_origin_correlation
            )
            self._store_result("activity_poll", result)
        except Exception as exc:
            logger.exception("Scheduled activity poll failed")
            result = {"error": str(exc), "timestamp_utc": datetime.now(timezone.utc).isoformat()}
            self._store_result("activity_poll", result)
        return result

    def _execute_logon_poll(self) -> dict[str, Any]:
        try:
            result = LogonIngestor(self.settings).run()
            self._store_result("logon_poll", result)
        except Exception as exc:
            logger.exception("Scheduled logon poll failed")
            result = {"error": str(exc), "timestamp_utc": datetime.now(timezone.utc).isoformat()}
            self._store_result("logon_poll", result)
        return result

    def _execute_update_check(self) -> dict[str, Any]:
        if self.update_monitor is None:
            result = {"status": "disabled", "error": "Update monitor is not configured.", "checked_at_utc": datetime.now(timezone.utc).isoformat()}
            self._store_result("update_check", result)
            return result

        try:
            result = self.update_monitor.refresh()
            self._store_result("update_check", result)
        except Exception as exc:
            logger.exception("Scheduled update check failed")
            result = {"status": "error", "error": str(exc), "checked_at_utc": datetime.now(timezone.utc).isoformat()}
            self._store_result("update_check", result)
        return result

    def _store_result(self, job_id: str, result: dict[str, Any]) -> None:
        with self._lock:
            self._latest_results[job_id] = result

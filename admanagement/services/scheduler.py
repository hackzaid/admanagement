from __future__ import annotations

import logging
from datetime import datetime, timezone
from threading import Lock
from typing import Any

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

from admanagement.collectors.event_ingestor import EventIngestor
from admanagement.collectors.ldap_collector import LdapCollector
from admanagement.collectors.logon_ingestor import LogonIngestor
from admanagement.core.config import Settings


logger = logging.getLogger(__name__)


class CollectorScheduler:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._scheduler = BackgroundScheduler(timezone=timezone.utc)
        self._lock = Lock()
        self._run_lock = Lock()
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
        with self._run_lock:
            triggered_at = datetime.now(timezone.utc).isoformat()
            results: dict[str, dict[str, Any]] = {
                "activity_poll": self._execute_activity_poll(),
                "logon_poll": self._execute_logon_poll(),
            }
            if include_snapshot:
                results["ldap_snapshot"] = self._execute_ldap_snapshot()

            return {
                "triggered_at_utc": triggered_at,
                "include_snapshot": include_snapshot,
                "results": results,
            }

    def _run_ldap_snapshot(self) -> dict[str, Any]:
        with self._run_lock:
            return self._execute_ldap_snapshot()

    def _run_activity_poll(self) -> dict[str, Any]:
        with self._run_lock:
            return self._execute_activity_poll()

    def _run_logon_poll(self) -> dict[str, Any]:
        with self._run_lock:
            return self._execute_logon_poll()

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

    def _store_result(self, job_id: str, result: dict[str, Any]) -> None:
        with self._lock:
            self._latest_results[job_id] = result

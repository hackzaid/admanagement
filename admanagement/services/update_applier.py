from __future__ import annotations

import shutil
import subprocess
from datetime import datetime, timezone
from threading import Lock
from typing import Any

from admanagement.core.config import Settings


class UpdateApplier:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._lock = Lock()
        self._status: dict[str, Any] = {
            "enabled": settings.update_apply_enabled,
            "state": "idle",
            "last_requested_at_utc": None,
            "last_started_at_utc": None,
            "last_completed_at_utc": None,
            "last_error": None,
            "runner_container_id": None,
            "host_project_path": settings.update_host_project_path,
            "runner_image": settings.update_runner_image,
        }

    def status(self) -> dict[str, Any]:
        with self._lock:
            return dict(self._status)

    def apply(self) -> dict[str, Any]:
        now = datetime.now(timezone.utc).isoformat()
        with self._lock:
            self._status["last_requested_at_utc"] = now
            self._status["last_error"] = None

            if not self.settings.update_apply_enabled:
                self._status["state"] = "disabled"
                self._status["last_error"] = "In-app update apply is disabled for this deployment."
                return dict(self._status)

            if self._status["state"] == "running":
                self._status["last_error"] = "An update is already in progress."
                return dict(self._status)

            self._status["state"] = "starting"
            self._status["last_started_at_utc"] = now

        try:
            container_id = self._start_runner()
        except Exception as exc:
            with self._lock:
                self._status["state"] = "error"
                self._status["last_error"] = str(exc)
                self._status["last_completed_at_utc"] = datetime.now(timezone.utc).isoformat()
                self._status["runner_container_id"] = None
                return dict(self._status)

        with self._lock:
            self._status["state"] = "running"
            self._status["runner_container_id"] = container_id
            return dict(self._status)

    def _start_runner(self) -> str:
        docker_binary = shutil.which("docker")
        if not docker_binary:
            raise RuntimeError(
                "This deployment cannot apply updates in-app yet because the running backend "
                "image does not include the Docker CLI. Rebuild once from the host with "
                "'sudo docker compose -f docker-compose.prod.yml up -d --build', then retry "
                "future updates from inside the app."
            )

        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
        runner_name = f"admanagement-update-runner-{timestamp}"
        command = [
            docker_binary,
            "run",
            "--detach",
            "--rm",
            "--name",
            runner_name,
            "-v",
            "/var/run/docker.sock:/var/run/docker.sock",
            "-v",
            f"{self.settings.update_host_project_path}:{self.settings.update_host_project_path}",
            "-w",
            self.settings.update_host_project_path,
            self.settings.update_runner_image,
            "sh",
            "-lc",
            "./scripts/upgrade.sh",
        ]
        completed = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=30,
            check=True,
        )
        return completed.stdout.strip()

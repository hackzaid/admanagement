from __future__ import annotations

import re
from datetime import datetime, timezone
from threading import Lock
from typing import Any

import httpx

from admanagement import __version__
from admanagement.core.config import Settings


def _parse_version(value: str) -> tuple[int, ...]:
    cleaned = value.strip().lstrip("vV")
    parts = re.findall(r"\d+", cleaned)
    if not parts:
        return (0,)
    return tuple(int(part) for part in parts)


class UpdateMonitor:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._lock = Lock()
        self._cached_status = self._base_status()

    def get_status(self) -> dict[str, Any]:
        with self._lock:
            return dict(self._cached_status)

    def refresh(self) -> dict[str, Any]:
        status = self._base_status()
        status["checked_at_utc"] = datetime.now(timezone.utc).isoformat()

        if not self.settings.update_check_enabled:
            status["status"] = "disabled"
            return self._store(status)

        if not self.settings.update_repository:
            status["status"] = "disabled"
            status["error"] = "No update repository is configured."
            return self._store(status)

        if self.settings.update_channel != "releases":
            status["status"] = "error"
            status["error"] = f"Unsupported update channel: {self.settings.update_channel}"
            return self._store(status)

        headers = {
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }
        token = self.settings.update_github_token.get_secret_value()
        if token:
            headers["Authorization"] = f"Bearer {token}"

        url = f"https://api.github.com/repos/{self.settings.update_repository}/releases/latest"

        try:
            with httpx.Client(timeout=10.0, headers=headers) as client:
                response = client.get(url)
                response.raise_for_status()
                payload = response.json()
        except Exception as exc:
            status["status"] = "error"
            status["error"] = str(exc)
            return self._store(status)

        latest_tag = payload.get("tag_name") or payload.get("name") or ""
        latest_version = latest_tag.lstrip("vV")
        current_version = status["current_version"]

        status.update(
            {
                "status": "ok",
                "latest_version": latest_version or None,
                "latest_release_name": payload.get("name") or latest_tag or None,
                "latest_release_url": payload.get("html_url"),
                "latest_published_at_utc": payload.get("published_at"),
                "release_notes_excerpt": (payload.get("body") or "")[:500] or None,
                "update_available": _parse_version(latest_version or "0") > _parse_version(current_version),
            }
        )
        return self._store(status)

    def _store(self, status: dict[str, Any]) -> dict[str, Any]:
        with self._lock:
            self._cached_status = status
            return dict(self._cached_status)

    def _base_status(self) -> dict[str, Any]:
        return {
            "status": "unknown",
            "current_version": __version__,
            "repository": self.settings.update_repository,
            "channel": self.settings.update_channel,
            "branch": self.settings.update_branch,
            "checked_at_utc": None,
            "latest_version": None,
            "latest_release_name": None,
            "latest_release_url": None,
            "latest_published_at_utc": None,
            "release_notes_excerpt": None,
            "update_available": False,
            "upgrade_instructions": self._upgrade_instructions(),
            "error": None,
        }

    def _upgrade_instructions(self) -> list[str]:
        if self.settings.update_deploy_mode == "docker-compose":
            return [
                "git pull",
                "docker compose -f docker-compose.prod.yml up -d --build",
            ]
        if self.settings.update_deploy_mode == "windows-docker":
            return [
                "git pull",
                ".\\Start-Prod.ps1",
            ]
        return ["git pull"]

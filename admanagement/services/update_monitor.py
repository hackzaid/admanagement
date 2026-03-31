from __future__ import annotations

import re
import subprocess
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

        headers = {
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }
        token = self.settings.update_github_token.get_secret_value()
        if token:
            headers["Authorization"] = f"Bearer {token}"

        try:
            with httpx.Client(timeout=10.0, headers=headers) as client:
                if self.settings.update_channel == "branch":
                    status = self._refresh_from_branch(status, client)
                elif self.settings.update_channel == "releases":
                    status = self._refresh_from_release_or_branch(status, client)
                else:
                    status["status"] = "error"
                    status["error"] = f"Unsupported update channel: {self.settings.update_channel}"
        except Exception as exc:
            status["status"] = "error"
            status["error"] = str(exc)
            return self._store(status)
        return self._store(status)

    def _refresh_from_release_or_branch(self, status: dict[str, Any], client: httpx.Client) -> dict[str, Any]:
        url = f"https://api.github.com/repos/{self.settings.update_repository}/releases/latest"
        try:
            response = client.get(url)
            response.raise_for_status()
            payload = response.json()
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code == 404:
                status = self._refresh_from_branch(status, client)
                status["channel"] = "branch"
                status["error"] = "No GitHub release found. Falling back to branch tracking."
                return status
            raise

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
        return status

    def _refresh_from_branch(self, status: dict[str, Any], client: httpx.Client) -> dict[str, Any]:
        url = f"https://api.github.com/repos/{self.settings.update_repository}/commits/{self.settings.update_branch}"
        response = client.get(url)
        response.raise_for_status()
        payload = response.json()

        latest_sha = str(payload.get("sha") or "").strip()
        current_sha = self._current_commit()
        commit = payload.get("commit") or {}
        author = commit.get("author") or {}
        message = str(commit.get("message") or "").strip()

        status.update(
            {
                "status": "ok",
                "current_ref": current_sha or None,
                "latest_ref": latest_sha or None,
                "latest_version": latest_sha[:7] if latest_sha else None,
                "latest_release_name": message.splitlines()[0][:120] if message else f"{self.settings.update_branch} HEAD",
                "latest_release_url": payload.get("html_url"),
                "latest_published_at_utc": author.get("date"),
                "release_notes_excerpt": message[:500] or None,
                "update_available": bool(current_sha and latest_sha and current_sha != latest_sha),
            }
        )
        if not current_sha:
            status["error"] = "Current build commit is unknown. Set ADMANAGEMENT_BUILD_COMMIT during deployment for precise branch update checks."
        return status

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
            "current_ref": self._current_commit() or None,
            "latest_ref": None,
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

    def _current_commit(self) -> str:
        if self.settings.build_commit.strip():
            return self.settings.build_commit.strip()
        try:
            completed = subprocess.run(
                ["git", "rev-parse", "HEAD"],
                capture_output=True,
                text=True,
                timeout=5,
                check=True,
            )
            return completed.stdout.strip()
        except Exception:
            return ""

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

from __future__ import annotations

import json
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import func, select

from admanagement.db.session import SessionLocal
from admanagement.models.snapshot import DirectorySnapshot


UAC_ACCOUNTDISABLE = 0x0002
UAC_DONT_EXPIRE_PASSWORD = 0x10000


@dataclass(slots=True)
class SnapshotObject:
    snapshot: DirectorySnapshot
    payload: dict[str, Any]


def parse_payload(payload_json: str | None) -> dict[str, Any]:
    if not payload_json:
        return {}
    return json.loads(payload_json)


def coerce_list(value: Any) -> list[str]:
    if value is None or value == "":
        return []
    if isinstance(value, list):
        return [str(item) for item in value if str(item)]
    return [str(value)]


def parse_uac(payload: dict[str, Any]) -> int:
    raw = payload.get("userAccountControl")
    if isinstance(raw, list):
        raw = raw[0] if raw else 0
    if raw in (None, ""):
        return 0
    try:
        return int(str(raw))
    except ValueError:
        return 0


def is_enabled(payload: dict[str, Any]) -> bool:
    return (parse_uac(payload) & UAC_ACCOUNTDISABLE) == 0


def password_never_expires(payload: dict[str, Any]) -> bool:
    return (parse_uac(payload) & UAC_DONT_EXPIRE_PASSWORD) != 0


def parse_directory_timestamp(value: Any) -> datetime | None:
    if value in (None, "", "0"):
        return None
    if isinstance(value, list):
        value = value[0] if value else None
    if value in (None, "", "0"):
        return None

    text = str(value).strip()
    if not text:
        return None

    if text.isdigit():
        raw = int(text)
        if raw <= 0:
            return None
        epoch = datetime(1601, 1, 1, tzinfo=timezone.utc)
        return epoch + timedelta(microseconds=raw / 10)

    iso_text = text.replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(iso_text)
    except ValueError:
        return None

    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


class SnapshotAnalysisService:
    def list_runs(self, limit: int = 10) -> list[dict[str, Any]]:
        with SessionLocal() as session:
            rows = session.execute(
                select(
                    DirectorySnapshot.run_id,
                    func.min(DirectorySnapshot.captured_at_utc),
                    func.count(DirectorySnapshot.id),
                )
                .group_by(DirectorySnapshot.run_id)
                .order_by(func.min(DirectorySnapshot.captured_at_utc).desc())
                .limit(limit)
            ).all()

            output: list[dict[str, Any]] = []
            for run_id, captured_at_utc, total_objects in rows:
                counts = session.execute(
                    select(DirectorySnapshot.object_type, func.count(DirectorySnapshot.id))
                    .where(DirectorySnapshot.run_id == run_id)
                    .group_by(DirectorySnapshot.object_type)
                ).all()
                output.append(
                    {
                        "run_id": run_id,
                        "captured_at_utc": captured_at_utc.isoformat(),
                        "total_objects": total_objects,
                        "counts": {object_type: count for object_type, count in counts},
                    }
                )
            return output

    def latest_run_id(self) -> str | None:
        runs = self.list_runs(limit=1)
        return runs[0]["run_id"] if runs else None

    def summarize_run(self, run_id: str | None = None, stale_days: int = 180) -> dict[str, Any]:
        selected_run_id = run_id or self.latest_run_id()
        if not selected_run_id:
            return {"run_id": None, "message": "No snapshot runs found."}

        snapshots = self._load_run(selected_run_id)
        counts = Counter(snapshot.snapshot.object_type for snapshot in snapshots)

        users = [item for item in snapshots if item.snapshot.object_type == "user"]
        computers = [item for item in snapshots if item.snapshot.object_type == "computer"]
        privileged_groups = [item for item in snapshots if item.snapshot.object_type == "privileged_group"]

        stale_users = self._find_stale_objects(users, stale_days=stale_days, object_type="user")
        stale_computers = self._find_stale_objects(computers, stale_days=stale_days, object_type="computer")
        non_expiring_users = self._find_password_never_expires(users)
        privileged_summary = self._summarize_privileged_groups(privileged_groups)

        return {
            "run_id": selected_run_id,
            "captured_at_utc": snapshots[0].snapshot.captured_at_utc.isoformat() if snapshots else None,
            "counts": dict(counts),
            "findings": {
                "stale_users": {
                    "count": len(stale_users),
                    "sample": stale_users[:10],
                },
                "stale_computers": {
                    "count": len(stale_computers),
                    "sample": stale_computers[:10],
                },
                "password_never_expires": {
                    "count": len(non_expiring_users),
                    "sample": non_expiring_users[:10],
                },
                "privileged_groups": privileged_summary,
            },
        }

    def compare_runs(
        self,
        baseline_run_id: str,
        target_run_id: str | None = None,
        stale_days: int = 180,
    ) -> dict[str, Any]:
        selected_target_run_id = target_run_id or self.latest_run_id()
        if not selected_target_run_id:
            return {"message": "No target run found."}

        baseline = self._index_run(self._load_run(baseline_run_id))
        target = self._index_run(self._load_run(selected_target_run_id))

        if not baseline:
            return {"message": f"Baseline run not found: {baseline_run_id}"}
        if not target:
            return {"message": f"Target run not found: {selected_target_run_id}"}

        object_count_delta = self._object_count_delta(baseline, target)
        status_changes = self._status_changes(baseline, target)
        privileged_membership_changes = self._privileged_group_changes(baseline, target)

        target_summary = self.summarize_run(run_id=selected_target_run_id, stale_days=stale_days)

        return {
            "baseline_run_id": baseline_run_id,
            "target_run_id": selected_target_run_id,
            "object_count_delta": object_count_delta,
            "status_changes": status_changes,
            "privileged_membership_changes": privileged_membership_changes,
            "target_findings": target_summary.get("findings", {}),
        }

    def _load_run(self, run_id: str) -> list[SnapshotObject]:
        with SessionLocal() as session:
            rows = session.execute(
                select(DirectorySnapshot)
                .where(DirectorySnapshot.run_id == run_id)
                .order_by(DirectorySnapshot.object_type, DirectorySnapshot.object_name)
            ).scalars().all()
            return [SnapshotObject(snapshot=row, payload=parse_payload(row.payload_json)) for row in rows]

    def _index_run(self, snapshots: list[SnapshotObject]) -> dict[str, dict[str, SnapshotObject]]:
        index: dict[str, dict[str, SnapshotObject]] = defaultdict(dict)
        for item in snapshots:
            index[item.snapshot.object_type][item.snapshot.object_name] = item
        return dict(index)

    def _find_stale_objects(
        self,
        snapshots: list[SnapshotObject],
        stale_days: int,
        object_type: str,
    ) -> list[dict[str, Any]]:
        cutoff = datetime.now(timezone.utc) - timedelta(days=stale_days)
        findings: list[dict[str, Any]] = []

        for item in snapshots:
            if not is_enabled(item.payload):
                continue
            last_logon = parse_directory_timestamp(item.payload.get("lastLogonTimestamp"))
            if last_logon is not None and last_logon >= cutoff:
                continue

            findings.append(
                {
                    "name": item.snapshot.object_name,
                    "object_type": object_type,
                    "distinguished_name": item.snapshot.distinguished_name,
                    "enabled": True,
                    "last_logon_utc": last_logon.isoformat() if last_logon else None,
                    "days_since_logon": None if last_logon is None else (datetime.now(timezone.utc) - last_logon).days,
                }
            )

        findings.sort(key=lambda row: (row["last_logon_utc"] is not None, row["last_logon_utc"] or "", row["name"]))
        return findings

    def _find_password_never_expires(self, users: list[SnapshotObject]) -> list[dict[str, Any]]:
        findings: list[dict[str, Any]] = []
        for item in users:
            if not is_enabled(item.payload):
                continue
            if not password_never_expires(item.payload):
                continue
            findings.append(
                {
                    "name": item.snapshot.object_name,
                    "distinguished_name": item.snapshot.distinguished_name,
                    "user_principal_name": item.payload.get("userPrincipalName", ""),
                }
            )
        findings.sort(key=lambda row: row["name"])
        return findings

    def _summarize_privileged_groups(self, groups: list[SnapshotObject]) -> dict[str, Any]:
        summary: dict[str, Any] = {}
        for item in groups:
            members = coerce_list(item.payload.get("member"))
            summary[item.snapshot.object_name] = {
                "member_count": len(members),
                "sample_members": members[:10],
            }
        return summary

    def _object_count_delta(
        self,
        baseline: dict[str, dict[str, SnapshotObject]],
        target: dict[str, dict[str, SnapshotObject]],
    ) -> dict[str, dict[str, int]]:
        object_types = sorted(set(baseline) | set(target))
        delta: dict[str, dict[str, int]] = {}
        for object_type in object_types:
            baseline_count = len(baseline.get(object_type, {}))
            target_count = len(target.get(object_type, {}))
            delta[object_type] = {
                "baseline_count": baseline_count,
                "target_count": target_count,
                "delta": target_count - baseline_count,
            }
        return delta

    def _status_changes(
        self,
        baseline: dict[str, dict[str, SnapshotObject]],
        target: dict[str, dict[str, SnapshotObject]],
    ) -> dict[str, list[dict[str, Any]]]:
        changes: dict[str, list[dict[str, Any]]] = {"enabled_to_disabled": [], "disabled_to_enabled": []}
        for object_type in ("user", "computer"):
            shared_names = set(baseline.get(object_type, {})) & set(target.get(object_type, {}))
            for name in sorted(shared_names):
                before = baseline[object_type][name]
                after = target[object_type][name]
                before_enabled = is_enabled(before.payload)
                after_enabled = is_enabled(after.payload)
                if before_enabled == after_enabled:
                    continue
                row = {
                    "object_type": object_type,
                    "name": name,
                    "distinguished_name": after.snapshot.distinguished_name or before.snapshot.distinguished_name,
                }
                if before_enabled and not after_enabled:
                    changes["enabled_to_disabled"].append(row)
                elif not before_enabled and after_enabled:
                    changes["disabled_to_enabled"].append(row)
        return changes

    def _privileged_group_changes(
        self,
        baseline: dict[str, dict[str, SnapshotObject]],
        target: dict[str, dict[str, SnapshotObject]],
    ) -> dict[str, dict[str, list[str]]]:
        changes: dict[str, dict[str, list[str]]] = {}
        baseline_groups = baseline.get("privileged_group", {})
        target_groups = target.get("privileged_group", {})
        for group_name in sorted(set(baseline_groups) | set(target_groups)):
            baseline_members = set(coerce_list(baseline_groups.get(group_name).payload.get("member"))) if group_name in baseline_groups else set()
            target_members = set(coerce_list(target_groups.get(group_name).payload.get("member"))) if group_name in target_groups else set()
            added = sorted(target_members - baseline_members)
            removed = sorted(baseline_members - target_members)
            if added or removed:
                changes[group_name] = {
                    "added_members": added,
                    "removed_members": removed,
                }
        return changes

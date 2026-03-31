from __future__ import annotations

import csv
import json
from dataclasses import dataclass
from datetime import datetime, timezone
from io import StringIO
from pathlib import Path
from typing import Any

from sqlalchemy import Select, and_, func, or_, select

from admanagement.core.config import Settings
from admanagement.db.bootstrap import init_db
from admanagement.db.session import SessionLocal
from admanagement.models.activity import AdminActivity
from admanagement.models.checkpoint import EventCheckpoint


@dataclass(slots=True)
class ActivityImportResult:
    imported_rows: int
    source_path: str


def parse_activity_time(value: str) -> datetime:
    text = value.strip()
    if text.endswith(" UTC"):
        return datetime.strptime(text, "%Y-%m-%d %H:%M:%S UTC").replace(tzinfo=timezone.utc)

    normalized = normalize_iso_datetime(text)
    dt = datetime.fromisoformat(normalized)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def normalize_iso_datetime(value: str) -> str:
    text = value.strip().replace("Z", "+00:00")
    if "." not in text:
        return text

    head, dot, tail = text.partition(".")
    if not dot:
        return text

    timezone_markers = ["+", "-"]
    timezone_index = -1
    for marker in timezone_markers:
        candidate_index = tail.find(marker)
        if candidate_index > 0:
            timezone_index = candidate_index if timezone_index == -1 else min(timezone_index, candidate_index)
    if timezone_index == -1:
        fraction = tail
        suffix = ""
    else:
        fraction = tail[:timezone_index]
        suffix = tail[timezone_index:]

    digits = "".join(character for character in fraction if character.isdigit())
    if not digits:
        return text

    normalized_fraction = digits[:6].ljust(6, "0")
    return f"{head}.{normalized_fraction}{suffix}"


def parse_optional_int(value: str | None) -> int | None:
    if value is None:
        return None
    text = value.strip()
    if not text:
        return None
    try:
        return int(text)
    except ValueError:
        return None


class ActivityAnalysisService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def import_csv(self, path: str) -> dict[str, Any]:
        csv_path = Path(path)
        if not csv_path.exists():
            raise FileNotFoundError(f"Activity CSV not found: {csv_path}")

        init_db()
        imported_rows = 0
        with csv_path.open("r", encoding="utf-8-sig", newline="") as handle:
            reader = csv.DictReader(handle)
            with SessionLocal() as session:
                for row in reader:
                    event_id = parse_optional_int(row.get("EventId"))
                    activity_time = parse_activity_time(row.get("TimeCreatedUtc", "").strip())
                    session.add(
                        AdminActivity(
                            actor=(row.get("Actor") or "").strip() or "unknown",
                            action=(row.get("Action") or "").strip() or "unknown",
                            target_type=(row.get("TargetType") or "").strip() or "unknown",
                            target_name=(row.get("TargetName") or "").strip() or "unknown",
                            distinguished_name=(row.get("DistinguishedName") or "").strip() or None,
                            source_workstation=(row.get("SourceWorkstation") or "").strip() or None,
                            source_ip_address=(row.get("SourceIpAddress") or "").strip() or None,
                            domain_controller=(row.get("DomainController") or "").strip() or "unknown",
                            event_id=event_id or 0,
                            event_record_id=parse_optional_int(row.get("EventRecordId")),
                            activity_time_utc=activity_time,
                            raw_payload=json.dumps(row, ensure_ascii=True, sort_keys=True),
                        )
                    )
                    imported_rows += 1
                session.commit()

        result = ActivityImportResult(imported_rows=imported_rows, source_path=str(csv_path))
        return {
            "collector": "event_ingestor",
            "mode": self.settings.event_ingestor_mode,
            "source_path": result.source_path,
            "imported_rows": result.imported_rows,
        }

    def import_records(self, records: list[dict[str, Any]], source_name: str) -> dict[str, Any]:
        init_db()
        imported_rows = 0
        duplicate_rows = 0

        with SessionLocal() as session:
            for row in records:
                event_record_id = parse_optional_int(str(row.get("event_record_id", "") or ""))
                domain_controller = (row.get("domain_controller") or "").strip() or source_name

                if event_record_id is not None:
                    existing = session.execute(
                        select(AdminActivity.id).where(
                            AdminActivity.domain_controller == domain_controller,
                            AdminActivity.event_record_id == event_record_id,
                        )
                    ).first()
                    if existing:
                        duplicate_rows += 1
                        continue

                activity_time = parse_activity_time(str(row.get("activity_time_utc", "") or row.get("time_created_utc", "")))
                session.add(
                    AdminActivity(
                        actor=(row.get("actor") or "").strip() or "unknown",
                        action=(row.get("action") or "").strip() or "unknown",
                        target_type=(row.get("target_type") or "").strip() or "unknown",
                        target_name=(row.get("target_name") or "").strip() or "unknown",
                        distinguished_name=(row.get("distinguished_name") or "").strip() or None,
                        source_workstation=(row.get("source_workstation") or "").strip() or None,
                        source_ip_address=(row.get("source_ip_address") or "").strip() or None,
                        domain_controller=domain_controller,
                        event_id=parse_optional_int(str(row.get("event_id", "") or "")) or 0,
                        event_record_id=event_record_id,
                        activity_time_utc=activity_time,
                        raw_payload=json.dumps(row, ensure_ascii=True, sort_keys=True),
                    )
                )
                imported_rows += 1

            session.commit()

        return {
            "collector": "event_ingestor",
            "mode": self.settings.event_ingestor_mode,
            "source_name": source_name,
            "imported_rows": imported_rows,
            "duplicate_rows": duplicate_rows,
        }

    def summarize(self, limit: int = 10) -> dict[str, Any]:
        return self.summarize_filtered(limit=limit)

    def summarize_filtered(
        self,
        *,
        limit: int = 10,
        start_time_utc: str | None = None,
        end_time_utc: str | None = None,
    ) -> dict[str, Any]:
        with SessionLocal() as session:
            base_statement = self._apply_activity_filters(
                statement=select(AdminActivity),
                actor=None,
                action=None,
                target_type=None,
                domain_controller=None,
                report_key=None,
                search=None,
                start_time_utc=start_time_utc,
                end_time_utc=end_time_utc,
            ).subquery()

            total_count = session.execute(select(func.count()).select_from(base_statement)).scalar_one()
            latest_time = session.execute(select(func.max(base_statement.c.activity_time_utc))).scalar_one()

            top_actors = session.execute(
                select(base_statement.c.actor, func.count())
                .group_by(base_statement.c.actor)
                .order_by(func.count().desc())
                .limit(limit)
            ).all()

            action_counts = session.execute(
                select(base_statement.c.target_type, base_statement.c.action, func.count())
                .group_by(base_statement.c.target_type, base_statement.c.action)
                .order_by(func.count().desc())
                .limit(limit)
            ).all()

            recent_deletes = session.execute(
                select(AdminActivity)
                .where(
                    AdminActivity.id.in_(
                        select(base_statement.c.id).where(base_statement.c.action == "Delete")
                    )
                )
                .order_by(AdminActivity.activity_time_utc.desc())
                .limit(limit)
            ).scalars().all()

        return {
            "total_count": total_count,
            "latest_activity_time_utc": latest_time.isoformat() if latest_time else None,
            "top_actors": [{"actor": actor, "count": count} for actor, count in top_actors],
            "action_counts": [
                {"target_type": target_type, "action": action, "count": count}
                for target_type, action, count in action_counts
            ],
            "recent_deletes": [
                {
                    "time_utc": row.activity_time_utc.isoformat(),
                    "actor": row.actor,
                    "target_type": row.target_type,
                    "target_name": row.target_name,
                    "domain_controller": row.domain_controller,
                }
                for row in recent_deletes
            ],
        }

    def recent_activity(
        self,
        limit: int = 20,
        *,
        start_time_utc: str | None = None,
        end_time_utc: str | None = None,
    ) -> list[dict[str, Any]]:
        statement = self._apply_activity_filters(
            statement=select(AdminActivity),
            actor=None,
            action=None,
            target_type=None,
            domain_controller=None,
            report_key=None,
            search=None,
            start_time_utc=start_time_utc,
            end_time_utc=end_time_utc,
        )
        with SessionLocal() as session:
            rows = session.execute(
                statement.order_by(AdminActivity.activity_time_utc.desc()).limit(limit)
            ).scalars().all()

        return [
            {
                "time_utc": row.activity_time_utc.isoformat(),
                "actor": row.actor,
                "action": row.action,
                "target_type": row.target_type,
                "target_name": row.target_name,
                "domain_controller": row.domain_controller,
                "source_workstation": row.source_workstation,
                "source_ip_address": row.source_ip_address,
            }
            for row in rows
        ]

    def query_activity(
        self,
        *,
        limit: int = 50,
        offset: int = 0,
        actor: str | None = None,
        action: str | None = None,
        target_type: str | None = None,
        domain_controller: str | None = None,
        report_key: str | None = None,
        search: str | None = None,
        start_time_utc: str | None = None,
        end_time_utc: str | None = None,
    ) -> dict[str, Any]:
        statement = select(AdminActivity)
        statement = self._apply_activity_filters(
            statement=statement,
            actor=actor,
            action=action,
            target_type=target_type,
            domain_controller=domain_controller,
            report_key=report_key,
            search=search,
            start_time_utc=start_time_utc,
            end_time_utc=end_time_utc,
        )

        count_statement = select(func.count(AdminActivity.id))
        count_statement = self._apply_activity_filters(
            statement=count_statement,
            actor=actor,
            action=action,
            target_type=target_type,
            domain_controller=domain_controller,
            report_key=report_key,
            search=search,
            start_time_utc=start_time_utc,
            end_time_utc=end_time_utc,
        )

        with SessionLocal() as session:
            total = session.execute(count_statement).scalar_one()
            rows = session.execute(
                statement.order_by(AdminActivity.activity_time_utc.desc()).offset(offset).limit(limit)
            ).scalars().all()

        return {
            "total_count": total,
            "limit": limit,
            "offset": offset,
            "rows": [self._serialize_activity(row) for row in rows],
        }

    def export_activity_csv(
        self,
        *,
        actor: str | None = None,
        action: str | None = None,
        target_type: str | None = None,
        domain_controller: str | None = None,
        report_key: str | None = None,
        search: str | None = None,
        start_time_utc: str | None = None,
        end_time_utc: str | None = None,
        limit: int = 5000,
    ) -> str:
        query_result = self.query_activity(
            limit=limit,
            offset=0,
            actor=actor,
            action=action,
            target_type=target_type,
            domain_controller=domain_controller,
            report_key=report_key,
            search=search,
            start_time_utc=start_time_utc,
            end_time_utc=end_time_utc,
        )

        output = StringIO()
        fieldnames = [
            "time_utc",
            "actor",
            "action",
            "target_type",
            "target_name",
            "domain_controller",
            "source_workstation",
            "source_ip_address",
            "event_id",
            "event_record_id",
            "distinguished_name",
        ]
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        for row in query_result["rows"]:
            writer.writerow({name: row.get(name) for name in fieldnames})
        return output.getvalue()

    def query_domain_controller_summary(self, limit: int = 20) -> list[dict[str, Any]]:
        with SessionLocal() as session:
            rows = session.execute(
                select(
                    AdminActivity.domain_controller,
                    func.count(AdminActivity.id),
                    func.max(AdminActivity.activity_time_utc),
                )
                .group_by(AdminActivity.domain_controller)
                .order_by(func.count(AdminActivity.id).desc())
                .limit(limit)
            ).all()

        return [
            {
                "domain_controller": domain_controller,
                "count": count,
                "latest_activity_time_utc": latest.isoformat() if latest else None,
            }
            for domain_controller, count, latest in rows
        ]

    def query_actor_summary(self, limit: int = 20) -> list[dict[str, Any]]:
        with SessionLocal() as session:
            rows = session.execute(
                select(
                    AdminActivity.actor,
                    func.count(AdminActivity.id),
                    func.max(AdminActivity.activity_time_utc),
                )
                .group_by(AdminActivity.actor)
                .order_by(func.count(AdminActivity.id).desc())
                .limit(limit)
            ).all()

        return [
            {
                "actor": actor,
                "count": count,
                "latest_activity_time_utc": latest.isoformat() if latest else None,
            }
            for actor, count, latest in rows
        ]

    def get_checkpoint(self, checkpoint_type: str, source_name: str) -> datetime | None:
        with SessionLocal() as session:
            checkpoint = session.execute(
                select(EventCheckpoint).where(
                    EventCheckpoint.checkpoint_type == checkpoint_type,
                    EventCheckpoint.source_name == source_name,
                )
            ).scalar_one_or_none()
            return checkpoint.last_activity_time_utc if checkpoint else None

    def update_checkpoint(self, checkpoint_type: str, source_name: str, last_activity_time_utc: datetime | None) -> None:
        init_db()
        with SessionLocal() as session:
            checkpoint = session.execute(
                select(EventCheckpoint).where(
                    EventCheckpoint.checkpoint_type == checkpoint_type,
                    EventCheckpoint.source_name == source_name,
                )
            ).scalar_one_or_none()

            now = datetime.now(timezone.utc)
            if checkpoint is None:
                session.add(
                    EventCheckpoint(
                        checkpoint_type=checkpoint_type,
                        source_name=source_name,
                        last_activity_time_utc=last_activity_time_utc,
                        updated_at_utc=now,
                    )
                )
            else:
                checkpoint.last_activity_time_utc = last_activity_time_utc
                checkpoint.updated_at_utc = now

            session.commit()

    def _apply_activity_filters(
        self,
        *,
        statement: Select[Any],
        actor: str | None,
        action: str | None,
        target_type: str | None,
        domain_controller: str | None,
        report_key: str | None,
        search: str | None,
        start_time_utc: str | None,
        end_time_utc: str | None,
    ) -> Select[Any]:
        conditions: list[Any] = []

        report_target_type, report_action = self._report_key_filters(report_key)
        resolved_target_type = target_type or report_target_type
        resolved_action = action or report_action

        if actor:
            conditions.append(AdminActivity.actor.ilike(f"%{actor}%"))
        if resolved_action:
            conditions.append(AdminActivity.action == resolved_action)
        if resolved_target_type:
            conditions.append(AdminActivity.target_type == resolved_target_type)
        if domain_controller:
            conditions.append(AdminActivity.domain_controller.ilike(f"%{domain_controller}%"))
        if search:
            pattern = f"%{search}%"
            conditions.append(
                or_(
                    AdminActivity.actor.ilike(pattern),
                    AdminActivity.target_name.ilike(pattern),
                    AdminActivity.distinguished_name.ilike(pattern),
                    AdminActivity.source_workstation.ilike(pattern),
                    AdminActivity.source_ip_address.ilike(pattern),
                )
            )
        if start_time_utc:
            conditions.append(AdminActivity.activity_time_utc >= parse_activity_time(start_time_utc))
        if end_time_utc:
            conditions.append(AdminActivity.activity_time_utc <= parse_activity_time(end_time_utc))

        return statement.where(and_(*conditions)) if conditions else statement

    def _serialize_activity(self, row: AdminActivity) -> dict[str, Any]:
        return {
            "id": row.id,
            "time_utc": row.activity_time_utc.isoformat(),
            "actor": row.actor,
            "action": row.action,
            "target_type": row.target_type,
            "target_name": row.target_name,
            "domain_controller": row.domain_controller,
            "source_workstation": row.source_workstation,
            "source_ip_address": row.source_ip_address,
            "event_id": row.event_id,
            "event_record_id": row.event_record_id,
            "distinguished_name": row.distinguished_name,
        }

    def _report_key_filters(self, report_key: str | None) -> tuple[str | None, str | None]:
        if not report_key:
            return None, None

        mapping: dict[str, tuple[str | None, str | None]] = {
            "administrative-user-actions": ("User", None),
            "user-management": ("User", None),
            "group-management": ("Group", None),
            "computer-management": ("Computer", None),
            "ou-management": ("OU", None),
            "gpo-management": ("GPO", None),
            "gpo-setting-changes": ("GPO", "Modify"),
            "dns-changes": ("DNS", None),
            "permission-changes": ("Other", "Modify"),
            "all-ad-changes-on-dcs": (None, None),
            "all-ad-changes": (None, None),
            "all-ad-changes-by-user": (None, None),
            "configuration-auditing": (None, None),
        }
        return mapping.get(report_key, (None, None))

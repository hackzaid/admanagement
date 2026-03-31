from __future__ import annotations

import csv
from datetime import datetime, timezone
from io import StringIO
from typing import Any

from sqlalchemy import Select, String, and_, cast, func, literal, or_, select

from admanagement.db.bootstrap import init_db
from admanagement.db.session import SessionLocal
from admanagement.models.checkpoint import EventCheckpoint
from admanagement.models.logon_activity import LogonActivity
from admanagement.services.activity_analysis import normalize_iso_datetime


def parse_logon_time(value: str) -> datetime:
    normalized = normalize_iso_datetime(value)
    dt = datetime.fromisoformat(normalized)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


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


class LogonAnalysisService:
    def import_records(self, records: list[dict[str, Any]], source_name: str) -> dict[str, Any]:
        init_db()
        imported_rows = 0
        duplicate_rows = 0

        with SessionLocal() as session:
            for row in records:
                domain_controller = (row.get("domain_controller") or "").strip() or source_name
                event_record_id = parse_optional_int(str(row.get("event_record_id", "") or ""))

                if event_record_id is not None:
                    existing = session.execute(
                        select(LogonActivity.id).where(
                            LogonActivity.domain_controller == domain_controller,
                            LogonActivity.event_record_id == event_record_id,
                        )
                    ).first()
                    if existing:
                        duplicate_rows += 1
                        continue

                session.add(
                    LogonActivity(
                        actor=(row.get("actor") or "").strip() or "unknown",
                        event_type=(row.get("event_type") or "").strip() or "unknown",
                        domain_controller=domain_controller,
                        target_domain_name=(row.get("target_domain_name") or "").strip() or None,
                        source_workstation=(row.get("source_workstation") or "").strip() or None,
                        source_ip_address=(row.get("source_ip_address") or "").strip() or None,
                        source_port=(row.get("source_port") or "").strip() or None,
                        logon_type=(row.get("logon_type") or "").strip() or None,
                        authentication_package=(row.get("authentication_package") or "").strip() or None,
                        logon_id=(row.get("logon_id") or "").strip() or None,
                        event_id=parse_optional_int(str(row.get("event_id", "") or "")) or 0,
                        event_record_id=event_record_id,
                        activity_time_utc=parse_logon_time(str(row.get("activity_time_utc", "") or "")),
                    )
                )
                imported_rows += 1

            session.commit()

        return {"source_name": source_name, "imported_rows": imported_rows, "duplicate_rows": duplicate_rows}

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
            base_statement = self._apply_filters(
                statement=select(LogonActivity),
                actor=None,
                domain_controller=None,
                event_type=None,
                event_types=None,
                search=None,
                start_time_utc=start_time_utc,
                end_time_utc=end_time_utc,
            ).subquery()

            total_count = session.execute(select(func.count()).select_from(base_statement)).scalar_one()
            latest_time = session.execute(select(func.max(base_statement.c.activity_time_utc))).scalar_one()

            top_users = session.execute(
                select(base_statement.c.actor, func.count())
                .group_by(base_statement.c.actor)
                .order_by(func.count().desc())
                .limit(limit)
            ).all()

            top_failure_users = session.execute(
                select(base_statement.c.actor, func.count())
                .where(base_statement.c.event_type.in_(("LogonFailure", "AccountLockout")))
                .group_by(base_statement.c.actor)
                .order_by(func.count().desc())
                .limit(limit)
            ).all()

            event_mix = session.execute(
                select(base_statement.c.event_type, func.count())
                .group_by(base_statement.c.event_type)
                .order_by(func.count().desc())
                .limit(limit)
            ).all()

            source_key = func.coalesce(
                base_statement.c.source_workstation,
                base_statement.c.source_ip_address,
                cast(literal("Unknown"), String),
            )
            top_failure_sources = session.execute(
                select(
                    source_key,
                    func.count(),
                )
                .where(base_statement.c.event_type.in_(("LogonFailure", "AccountLockout")))
                .group_by(source_key)
                .order_by(func.count().desc())
                .limit(limit)
            ).all()

        return {
            "total_count": total_count,
            "latest_activity_time_utc": latest_time.isoformat() if latest_time else None,
            "top_users": [{"actor": actor, "count": count} for actor, count in top_users],
            "top_failure_users": [{"actor": actor, "count": count} for actor, count in top_failure_users],
            "event_mix": [{"event_type": event_type, "count": count} for event_type, count in event_mix],
            "event_counts": {event_type: count for event_type, count in event_mix},
            "top_failure_sources": [{"source": source, "count": count} for source, count in top_failure_sources],
        }

    def query_logons(
        self,
        *,
        limit: int = 50,
        offset: int = 0,
        actor: str | None = None,
        domain_controller: str | None = None,
        event_type: str | None = None,
        event_types: list[str] | None = None,
        search: str | None = None,
        start_time_utc: str | None = None,
        end_time_utc: str | None = None,
    ) -> dict[str, Any]:
        statement = select(LogonActivity)
        statement = self._apply_filters(
            statement=statement,
            actor=actor,
            domain_controller=domain_controller,
            event_type=event_type,
            event_types=event_types,
            search=search,
            start_time_utc=start_time_utc,
            end_time_utc=end_time_utc,
        )

        count_statement = select(func.count(LogonActivity.id))
        count_statement = self._apply_filters(
            statement=count_statement,
            actor=actor,
            domain_controller=domain_controller,
            event_type=event_type,
            event_types=event_types,
            search=search,
            start_time_utc=start_time_utc,
            end_time_utc=end_time_utc,
        )

        with SessionLocal() as session:
            total = session.execute(count_statement).scalar_one()
            rows = session.execute(
                statement.order_by(LogonActivity.activity_time_utc.desc()).offset(offset).limit(limit)
            ).scalars().all()

        return {
            "total_count": total,
            "limit": limit,
            "offset": offset,
            "rows": [self._serialize(row) for row in rows],
        }

    def export_csv(
        self,
        *,
        actor: str | None = None,
        domain_controller: str | None = None,
        event_type: str | None = None,
        event_types: list[str] | None = None,
        search: str | None = None,
        start_time_utc: str | None = None,
        end_time_utc: str | None = None,
        limit: int = 5000,
    ) -> str:
        result = self.query_logons(
            limit=limit,
            offset=0,
            actor=actor,
            domain_controller=domain_controller,
            event_type=event_type,
            event_types=event_types,
            search=search,
            start_time_utc=start_time_utc,
            end_time_utc=end_time_utc,
        )

        output = StringIO()
        fieldnames = [
            "time_utc",
            "actor",
            "event_type",
            "domain_controller",
            "target_domain_name",
            "source_workstation",
            "source_ip_address",
            "source_port",
            "logon_type",
            "authentication_package",
            "event_id",
            "event_record_id",
        ]
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        for row in result["rows"]:
            writer.writerow({name: row.get(name) for name in fieldnames})
        return output.getvalue()

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

    def _apply_filters(
        self,
        *,
        statement: Select[Any],
        actor: str | None,
        domain_controller: str | None,
        event_type: str | None,
        event_types: list[str] | None,
        search: str | None,
        start_time_utc: str | None,
        end_time_utc: str | None,
    ) -> Select[Any]:
        conditions: list[Any] = []
        if actor:
            conditions.append(LogonActivity.actor.ilike(f"%{actor}%"))
        if domain_controller:
            conditions.append(LogonActivity.domain_controller.ilike(f"%{domain_controller}%"))
        effective_event_types = [value for value in (event_types or []) if value]
        if event_type:
            conditions.append(LogonActivity.event_type == event_type)
        elif effective_event_types:
            conditions.append(LogonActivity.event_type.in_(effective_event_types))
        if search:
            pattern = f"%{search}%"
            conditions.append(
                or_(
                    LogonActivity.actor.ilike(pattern),
                    LogonActivity.source_workstation.ilike(pattern),
                    LogonActivity.source_ip_address.ilike(pattern),
                    LogonActivity.target_domain_name.ilike(pattern),
                )
            )
        if start_time_utc:
            conditions.append(LogonActivity.activity_time_utc >= parse_logon_time(start_time_utc))
        if end_time_utc:
            conditions.append(LogonActivity.activity_time_utc <= parse_logon_time(end_time_utc))

        return statement.where(and_(*conditions)) if conditions else statement

    def _serialize(self, row: LogonActivity) -> dict[str, Any]:
        return {
            "id": row.id,
            "time_utc": row.activity_time_utc.isoformat(),
            "actor": row.actor,
            "event_type": row.event_type,
            "domain_controller": row.domain_controller,
            "target_domain_name": row.target_domain_name,
            "source_workstation": row.source_workstation,
            "source_ip_address": row.source_ip_address,
            "source_port": row.source_port,
            "logon_type": row.logon_type,
            "authentication_package": row.authentication_package,
            "logon_id": row.logon_id,
            "event_id": row.event_id,
            "event_record_id": row.event_record_id,
        }

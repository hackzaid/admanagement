from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select

from admanagement.db.bootstrap import init_db
from admanagement.db.session import SessionLocal
from admanagement.models.saved_view import SavedView


class SavedViewService:
    def list_views(self, *, view_scope: str = "dashboard", owner_key: str = "default") -> list[dict[str, Any]]:
        init_db()
        with SessionLocal() as session:
            rows = session.execute(
                select(SavedView)
                .where(SavedView.view_scope == view_scope, SavedView.owner_key == owner_key)
                .order_by(SavedView.updated_at_utc.desc(), SavedView.id.desc())
            ).scalars().all()
            return [self._serialize(row) for row in rows]

    def upsert_view(
        self,
        *,
        name: str,
        state: dict[str, Any],
        view_scope: str = "dashboard",
        owner_key: str = "default",
    ) -> dict[str, Any]:
        init_db()
        normalized_name = name.strip()
        now = datetime.now(timezone.utc)
        with SessionLocal() as session:
            row = session.execute(
                select(SavedView).where(
                    SavedView.view_scope == view_scope,
                    SavedView.owner_key == owner_key,
                    SavedView.name == normalized_name,
                )
            ).scalar_one_or_none()
            if row is None:
                row = SavedView(
                    name=normalized_name,
                    view_scope=view_scope,
                    owner_key=owner_key,
                    state_json=json.dumps(state),
                    created_at_utc=now,
                    updated_at_utc=now,
                )
                session.add(row)
            else:
                row.state_json = json.dumps(state)
                row.updated_at_utc = now
            session.commit()
            return self._serialize(row)

    def delete_view(self, item_id: int, *, owner_key: str = "default") -> bool:
        init_db()
        with SessionLocal() as session:
            row = session.get(SavedView, item_id)
            if row is None or row.owner_key != owner_key:
                return False
            session.delete(row)
            session.commit()
            return True

    def _serialize(self, row: SavedView) -> dict[str, Any]:
        return {
            "id": row.id,
            "name": row.name,
            "view_scope": row.view_scope,
            "owner_key": row.owner_key,
            "state": json.loads(row.state_json or "{}"),
            "created_at_utc": row.created_at_utc.isoformat(),
            "updated_at_utc": row.updated_at_utc.isoformat(),
        }

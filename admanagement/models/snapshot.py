from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from admanagement.db.base import Base


class DirectorySnapshot(Base):
    __tablename__ = "directory_snapshot"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    run_id: Mapped[str] = mapped_column(String(64), index=True)
    snapshot_type: Mapped[str] = mapped_column(String(100), index=True)
    object_type: Mapped[str] = mapped_column(String(100), index=True)
    object_name: Mapped[str] = mapped_column(String(255), index=True)
    distinguished_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    captured_at_utc: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    payload_json: Mapped[str | None] = mapped_column(Text, nullable=True)

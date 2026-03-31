from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from admanagement.db.base import Base


class EventCheckpoint(Base):
    __tablename__ = "event_checkpoint"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    checkpoint_type: Mapped[str] = mapped_column(String(100), index=True)
    source_name: Mapped[str] = mapped_column(String(255), index=True)
    last_activity_time_utc: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    updated_at_utc: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)

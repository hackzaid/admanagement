from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from admanagement.db.base import Base


class AdminActivity(Base):
    __tablename__ = "admin_activity"
    __table_args__ = (
        Index("ix_admin_activity_dc_record", "domain_controller", "event_record_id"),
        Index("ix_admin_activity_time_action", "activity_time_utc", "action"),
        Index("ix_admin_activity_time_target", "activity_time_utc", "target_type"),
        Index("ix_admin_activity_time_actor", "activity_time_utc", "actor"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    actor: Mapped[str] = mapped_column(String(255), index=True)
    action: Mapped[str] = mapped_column(String(50), index=True)
    target_type: Mapped[str] = mapped_column(String(50), index=True)
    target_name: Mapped[str] = mapped_column(String(255), index=True)
    distinguished_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_workstation: Mapped[str | None] = mapped_column(String(255), nullable=True)
    source_ip_address: Mapped[str | None] = mapped_column(String(64), nullable=True)
    domain_controller: Mapped[str] = mapped_column(String(255), index=True)
    event_id: Mapped[int] = mapped_column(Integer, index=True)
    event_record_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    activity_time_utc: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    raw_payload: Mapped[str | None] = mapped_column(Text, nullable=True)

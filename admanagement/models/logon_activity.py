from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from admanagement.db.base import Base


class LogonActivity(Base):
    __tablename__ = "logon_activity"
    __table_args__ = (
        Index("ix_logon_activity_dc_record", "domain_controller", "event_record_id"),
        Index("ix_logon_activity_time_event", "activity_time_utc", "event_type"),
        Index("ix_logon_activity_time_logon_type", "activity_time_utc", "logon_type"),
        Index("ix_logon_activity_time_actor", "activity_time_utc", "actor"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    actor: Mapped[str] = mapped_column(String(255), index=True)
    event_type: Mapped[str] = mapped_column(String(50), index=True)
    domain_controller: Mapped[str] = mapped_column(String(255), index=True)
    target_domain_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    source_workstation: Mapped[str | None] = mapped_column(String(255), nullable=True)
    source_ip_address: Mapped[str | None] = mapped_column(String(64), nullable=True)
    source_port: Mapped[str | None] = mapped_column(String(32), nullable=True)
    logon_type: Mapped[str | None] = mapped_column(String(32), nullable=True)
    authentication_package: Mapped[str | None] = mapped_column(String(64), nullable=True)
    failure_status: Mapped[str | None] = mapped_column(String(64), nullable=True)
    failure_sub_status: Mapped[str | None] = mapped_column(String(64), nullable=True)
    failure_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    logon_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    event_id: Mapped[int] = mapped_column(Integer, index=True)
    event_record_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    activity_time_utc: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    raw_payload: Mapped[str | None] = mapped_column(Text, nullable=True)

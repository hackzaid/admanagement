from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from admanagement.db.base import Base


class RuntimeSetting(Base):
    __tablename__ = "runtime_setting"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    setting_key: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    setting_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_secret: Mapped[bool] = mapped_column(Boolean, default=False)
    updated_at_utc: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class SetupState(Base):
    __tablename__ = "setup_state"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    onboarding_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    completed_at_utc: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_bootstrap_at_utc: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

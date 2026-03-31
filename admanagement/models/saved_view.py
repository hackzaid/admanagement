from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from admanagement.db.base import Base


class SavedView(Base):
    __tablename__ = "saved_view"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), index=True)
    view_scope: Mapped[str] = mapped_column(String(64), index=True, default="dashboard")
    owner_key: Mapped[str] = mapped_column(String(128), index=True, default="default")
    state_json: Mapped[str] = mapped_column(Text)
    created_at_utc: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at_utc: Mapped[datetime] = mapped_column(DateTime(timezone=True))

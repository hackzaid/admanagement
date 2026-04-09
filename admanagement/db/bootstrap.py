from sqlalchemy import inspect, text

from admanagement.db.base import Base
from admanagement.db.session import engine
from admanagement import models  # noqa: F401


def _ensure_column(table_name: str, column_name: str, ddl: str) -> None:
    inspector = inspect(engine)
    if table_name not in inspector.get_table_names():
        return
    existing = {column["name"] for column in inspector.get_columns(table_name)}
    if column_name in existing:
        return
    with engine.begin() as connection:
        connection.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {ddl}"))


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    _ensure_column("logon_activity", "failure_status", "VARCHAR(64)")
    _ensure_column("logon_activity", "failure_sub_status", "VARCHAR(64)")
    _ensure_column("logon_activity", "failure_reason", "TEXT")
    _ensure_column("logon_activity", "raw_payload", "TEXT")

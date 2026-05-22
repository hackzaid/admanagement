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


def _ensure_model_indexes() -> None:
    for table in Base.metadata.sorted_tables:
        for index in table.indexes:
            index.create(bind=engine, checkfirst=True)


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    _ensure_column("logon_activity", "target_domain_name", "VARCHAR(255)")
    _ensure_column("logon_activity", "source_workstation", "VARCHAR(255)")
    _ensure_column("logon_activity", "source_ip_address", "VARCHAR(64)")
    _ensure_column("logon_activity", "source_port", "VARCHAR(32)")
    _ensure_column("logon_activity", "logon_type", "VARCHAR(32)")
    _ensure_column("logon_activity", "authentication_package", "VARCHAR(64)")
    _ensure_column("logon_activity", "failure_status", "VARCHAR(64)")
    _ensure_column("logon_activity", "failure_sub_status", "VARCHAR(64)")
    _ensure_column("logon_activity", "failure_reason", "TEXT")
    _ensure_column("logon_activity", "logon_id", "VARCHAR(64)")
    _ensure_column("logon_activity", "event_id", "INTEGER DEFAULT 0")
    _ensure_column("logon_activity", "event_record_id", "INTEGER")
    _ensure_column("logon_activity", "raw_payload", "TEXT")
    _ensure_model_indexes()

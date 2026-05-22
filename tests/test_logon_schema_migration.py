from __future__ import annotations

import subprocess
import sys
import textwrap


def test_logon_activity_bootstrap_adds_newer_columns() -> None:
    script = textwrap.dedent(
        """
        import os
        import sqlite3
        import tempfile

        fd, path = tempfile.mkstemp(suffix=".db")
        os.close(fd)

        connection = sqlite3.connect(path)
        connection.execute(
            '''CREATE TABLE logon_activity (
              id INTEGER PRIMARY KEY,
              actor VARCHAR(255) NOT NULL,
              event_type VARCHAR(50) NOT NULL,
              domain_controller VARCHAR(255) NOT NULL,
              target_domain_name VARCHAR(255),
              source_workstation VARCHAR(255),
              source_ip_address VARCHAR(64),
              logon_type VARCHAR(32),
              authentication_package VARCHAR(64),
              event_id INTEGER NOT NULL,
              event_record_id INTEGER,
              activity_time_utc DATETIME NOT NULL
            )'''
        )
        connection.execute(
            "INSERT INTO logon_activity "
            "(actor, event_type, domain_controller, event_id, activity_time_utc) "
            "VALUES ('alice', 'Logon', 'dc01', 4624, '2026-04-21 10:00:00')"
        )
        connection.commit()
        connection.close()

        os.environ["ADMANAGEMENT_DATABASE_URL"] = "sqlite+pysqlite:///" + path.replace("\\\\", "/")

        from admanagement.db.bootstrap import init_db
        from admanagement.db.session import engine
        from admanagement.services.logon_analysis import LogonAnalysisService
        from sqlalchemy import inspect

        init_db()
        columns = {column["name"] for column in inspect(engine).get_columns("logon_activity")}
        assert "source_port" in columns
        assert "logon_id" in columns
        indexes = {index["name"] for index in inspect(engine).get_indexes("logon_activity")}
        assert "ix_logon_activity_dc_record" in indexes

        result = LogonAnalysisService().query_logons(limit=1)
        assert result["total_count"] == 1
        assert result["rows"][0]["source_port"] is None
        assert result["rows"][0]["logon_id"] is None
        """
    )

    result = subprocess.run(
        [sys.executable, "-c", script],
        check=False,
        capture_output=True,
        text=True,
    )

    assert result.returncode == 0, result.stderr

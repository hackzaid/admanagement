from __future__ import annotations

import subprocess
import sys
import textwrap


def test_dashboard_uses_lightweight_summaries() -> None:
    script = textwrap.dedent(
        """
        import os
        import tempfile
        from datetime import datetime, timezone

        fd, path = tempfile.mkstemp(suffix=".db")
        os.close(fd)

        os.environ["ADMANAGEMENT_DATABASE_URL"] = "sqlite+pysqlite:///" + path.replace("\\\\", "/")
        os.environ["ADMANAGEMENT_EVENT_DC_LIST"] = '["dc01"]'

        from admanagement.core.config import get_settings
        from admanagement.db.bootstrap import init_db
        from admanagement.db.session import SessionLocal
        from admanagement.models.activity import AdminActivity
        from admanagement.models.logon_activity import LogonActivity
        from admanagement.models.snapshot import DirectorySnapshot
        from admanagement.services.dashboard import DashboardService

        init_db()
        now = datetime(2026, 5, 22, 9, 0, tzinfo=timezone.utc)
        with SessionLocal() as session:
            session.add(
                AdminActivity(
                    actor="alice",
                    action="Delete",
                    target_type="User",
                    target_name="bob",
                    distinguished_name=None,
                    source_workstation="ws01",
                    source_ip_address="10.0.0.1",
                    domain_controller="dc01",
                    event_id=4726,
                    event_record_id=100,
                    activity_time_utc=now,
                    raw_payload=None,
                )
            )
            session.add(
                LogonActivity(
                    actor="alice",
                    event_type="LogonFailure",
                    domain_controller="dc01",
                    target_domain_name="WATUUG",
                    source_workstation="ws01",
                    source_ip_address="10.0.0.1",
                    source_port=None,
                    logon_type="3",
                    authentication_package="NTLM",
                    failure_status="0xC000006A",
                    failure_sub_status=None,
                    failure_reason="Bad password",
                    logon_id=None,
                    event_id=4625,
                    event_record_id=200,
                    activity_time_utc=now,
                    raw_payload=None,
                )
            )
            session.add(
                DirectorySnapshot(
                    run_id="run-1",
                    snapshot_type="ldap",
                    object_type="user",
                    object_name="alice",
                    distinguished_name="CN=alice,DC=example,DC=local",
                    captured_at_utc=now,
                    payload_json='{"userAccountControl": "512"}',
                )
            )
            session.commit()

        overview = DashboardService(get_settings()).build_overview(
            start_time_utc="2026-05-16T00:00:00.000Z",
            end_time_utc="2026-05-22T23:59:59.000Z",
        )

        assert overview["activity_summary"]["total_count"] == 1
        assert overview["activity_summary"]["recent_deletes"][0]["target_name"] == "bob"
        assert overview["snapshot_summary"]["counts"]["user"] == 1
        assert overview["logon_summary"]["event_counts"]["LogonFailure"] == 1
        assert overview["logon_summary"]["top_failure_sources"][0]["source"] == "ws01"
        assert overview["recent_activity"][0]["target_name"] == "bob"
        """
    )

    result = subprocess.run(
        [sys.executable, "-c", script],
        check=False,
        capture_output=True,
        text=True,
    )

    assert result.returncode == 0, result.stderr

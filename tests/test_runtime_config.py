from __future__ import annotations

import subprocess
import sys
import textwrap


def test_setup_status_uses_default_domain_when_multiple_business_hours_exist() -> None:
    script = textwrap.dedent(
        """
        import json
        import os
        import tempfile
        from datetime import datetime, timezone

        fd, path = tempfile.mkstemp(suffix=".db")
        os.close(fd)

        os.environ["ADMANAGEMENT_DATABASE_URL"] = "sqlite+pysqlite:///" + path.replace("\\\\", "/")

        from admanagement.core.config import get_settings
        from admanagement.db.bootstrap import init_db
        from admanagement.db.session import SessionLocal
        from admanagement.models.configuration import BusinessHoursConfig, DomainControllerConfig, MonitoredDomain
        from admanagement.services.runtime_config import RuntimeConfigService

        init_db()
        now = datetime.now(timezone.utc)
        with SessionLocal() as session:
            old_domain = MonitoredDomain(
                name="old",
                domain_fqdn="old.example.local",
                ldap_server="ldaps://old",
                ldap_base_dn="DC=old,DC=example,DC=local",
                is_enabled=True,
                is_default=False,
                notes=None,
                created_at_utc=now,
                updated_at_utc=now,
            )
            active_domain = MonitoredDomain(
                name="watuug",
                domain_fqdn="watuug.watuafrica.co.ug",
                ldap_server="ldaps://192.168.10.4",
                ldap_base_dn="DC=watuug,DC=watuafrica,DC=co,DC=ug",
                is_enabled=True,
                is_default=True,
                notes=None,
                created_at_utc=now,
                updated_at_utc=now,
            )
            session.add_all([old_domain, active_domain])
            session.flush()
            session.add_all(
                [
                    BusinessHoursConfig(
                        domain_id=old_domain.id,
                        timezone_name="UTC",
                        start_hour=1,
                        end_hour=2,
                        working_days_json=json.dumps(["Sun"]),
                        updated_at_utc=now,
                    ),
                    BusinessHoursConfig(
                        domain_id=active_domain.id,
                        timezone_name="Africa/Kampala",
                        start_hour=8,
                        end_hour=18,
                        working_days_json=json.dumps(["Mon", "Tue"]),
                        updated_at_utc=now,
                    ),
                    DomainControllerConfig(
                        domain_id=active_domain.id,
                        name="192",
                        hostname="192.168.10.4",
                        event_fetch_interval_seconds=600,
                        status="configured",
                        is_enabled=True,
                        created_at_utc=now,
                        updated_at_utc=now,
                    ),
                ]
            )
            session.commit()

        status = RuntimeConfigService(get_settings()).get_setup_status()
        assert status["prefill"]["domain_fqdn"] == "watuug.watuafrica.co.ug"
        assert status["prefill"]["business_hours_timezone"] == "Africa/Kampala"
        assert status["prefill"]["domain_controllers"] == ["192.168.10.4"]
        """
    )

    result = subprocess.run(
        [sys.executable, "-c", script],
        check=False,
        capture_output=True,
        text=True,
    )

    assert result.returncode == 0, result.stderr

from __future__ import annotations

import subprocess
import sys
import textwrap


def test_domain_controller_seed_reuses_existing_hostnames() -> None:
    script = textwrap.dedent(
        """
        import os
        import tempfile

        fd, path = tempfile.mkstemp(suffix=".db")
        os.close(fd)

        os.environ["ADMANAGEMENT_DATABASE_URL"] = "sqlite+pysqlite:///" + path.replace("\\\\", "/")
        os.environ["ADMANAGEMENT_EVENT_DC_LIST"] = '["192.168.10.4","192.168.55.90"]'

        from admanagement.core.config import get_settings
        from admanagement.db.bootstrap import init_db
        from admanagement.db.session import SessionLocal
        from admanagement.models.configuration import DomainControllerConfig, MonitoredDomain
        from admanagement.services.configuration_service import ConfigurationService
        from sqlalchemy import select

        init_db()
        service = ConfigurationService(get_settings())
        service.overview()
        service.upsert_domain(
            name="watuug",
            domain_fqdn="watuug.watuafrica.co.ug",
            ldap_server="ldaps://192.168.10.4",
            ldap_base_dn="DC=watuug,DC=watuafrica,DC=co,DC=ug",
            is_enabled=True,
            is_default=True,
            notes="Configured via onboarding.",
        )

        with SessionLocal() as session:
            controllers = session.execute(select(DomainControllerConfig)).scalars().all()
            assert sorted(item.hostname for item in controllers) == ["192.168.10.4", "192.168.55.90"]
            domain = session.execute(
                select(MonitoredDomain).where(MonitoredDomain.domain_fqdn == "watuug.watuafrica.co.ug")
            ).scalar_one()
            assert all(item.domain_id == domain.id for item in controllers)
        """
    )

    result = subprocess.run(
        [sys.executable, "-c", script],
        check=False,
        capture_output=True,
        text=True,
    )

    assert result.returncode == 0, result.stderr

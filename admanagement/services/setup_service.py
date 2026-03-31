from __future__ import annotations

from typing import Any

from ldap3 import ALL, Connection, Server

from admanagement.core.config import Settings
from admanagement.services.configuration_service import ConfigurationService
from admanagement.services.runtime_config import RuntimeConfigService


class SetupService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.configuration_service = ConfigurationService(settings)
        self.runtime_service = RuntimeConfigService(settings)

    def status(self) -> dict[str, Any]:
        return self.runtime_service.get_setup_status()

    def bootstrap(
        self,
        *,
        domain_name: str,
        domain_fqdn: str,
        ldap_server: str,
        ldap_base_dn: str,
        ldap_bind_dn: str,
        ldap_bind_password: str,
        domain_controllers: list[str],
        winrm_username: str,
        winrm_domain: str,
        winrm_password: str,
        winrm_auth: str,
        winrm_use_ssl: bool,
        winrm_port: int,
        business_hours_timezone: str,
        business_hours_start: int,
        business_hours_end: int,
        working_days: list[str],
    ) -> dict[str, Any]:
        self.configuration_service.upsert_domain(
            name=domain_name,
            domain_fqdn=domain_fqdn,
            ldap_server=ldap_server,
            ldap_base_dn=ldap_base_dn,
            is_enabled=True,
            is_default=True,
            notes="Configured via onboarding.",
        )
        self.configuration_service.upsert_business_hours(
            timezone_name=business_hours_timezone,
            start_hour=business_hours_start,
            end_hour=business_hours_end,
            working_days=working_days,
        )
        for hostname in domain_controllers:
            self.configuration_service.upsert_domain_controller(
                hostname=hostname,
                name=hostname.split(".")[0],
                event_fetch_interval_seconds=max(self.settings.activity_poll_interval_minutes * 60, 60),
                is_enabled=True,
                status="configured",
            )

        self.runtime_service.save_runtime_settings(
            {
                "ldap_server": ldap_server,
                "ldap_base_dn": ldap_base_dn,
                "ldap_bind_dn": ldap_bind_dn,
                "ldap_bind_password": ldap_bind_password,
                "winrm_username": winrm_username,
                "winrm_domain": winrm_domain,
                "winrm_password": winrm_password,
                "winrm_auth": winrm_auth,
                "winrm_use_ssl": winrm_use_ssl,
                "winrm_port": winrm_port,
                "winrm_server_cert_validation": self.settings.winrm_server_cert_validation,
            }
        )
        return self.runtime_service.mark_onboarding_complete()

    def test_ldap(
        self,
        *,
        ldap_server: str,
        ldap_bind_dn: str,
        ldap_bind_password: str,
    ) -> dict[str, Any]:
        server = Server(
            ldap_server,
            get_info=ALL,
            connect_timeout=self.settings.ldap_connect_timeout,
        )
        connection = Connection(
            server,
            user=ldap_bind_dn,
            password=ldap_bind_password,
            auto_bind=True,
        )
        try:
            return {"ok": True, "server": ldap_server, "bound": connection.bound}
        finally:
            connection.unbind()

    def test_winrm(
        self,
        *,
        hostname: str,
        winrm_username: str,
        winrm_domain: str,
        winrm_password: str,
        winrm_auth: str,
        winrm_use_ssl: bool,
        winrm_port: int,
    ) -> dict[str, Any]:
        from pypsrp.client import Client

        username = winrm_username.strip()
        if username and "\\" not in username and "@" not in username and winrm_domain.strip():
            username = f"{winrm_domain.strip()}\\{username}"

        client = Client(
            server=hostname,
            username=username,
            password=winrm_password,
            ssl=winrm_use_ssl,
            port=winrm_port,
            auth=winrm_auth,
            cert_validation=self.settings.winrm_server_cert_validation,
            operation_timeout=self.settings.winrm_operation_timeout,
            read_timeout=self.settings.winrm_read_timeout,
        )
        stdout, streams, had_errors = client.execute_ps("$env:COMPUTERNAME")
        if had_errors:
            detail = " | ".join(str(item) for item in getattr(streams, "error", []) or []) or stdout.strip()
            raise RuntimeError(detail or "WinRM returned an error.")
        return {"ok": True, "hostname": hostname, "computer_name": stdout.strip()}

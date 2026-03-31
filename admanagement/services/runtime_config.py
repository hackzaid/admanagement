from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select

from admanagement.core.config import Settings
from admanagement.db.bootstrap import init_db
from admanagement.db.session import SessionLocal
from admanagement.models.configuration import BusinessHoursConfig, DomainControllerConfig, MonitoredDomain
from admanagement.models.runtime_config import RuntimeSetting, SetupState


class RuntimeConfigService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def get_setup_status(self) -> dict[str, Any]:
        init_db()
        with SessionLocal() as session:
            setup_state = self._ensure_setup_state(session)
            default_domain = session.execute(
                select(MonitoredDomain).where(MonitoredDomain.is_default.is_(True))
            ).scalar_one_or_none()
            controllers = (
                session.execute(
                    select(DomainControllerConfig).where(DomainControllerConfig.is_enabled.is_(True)).order_by(DomainControllerConfig.hostname)
                )
                .scalars()
                .all()
            )
            business_hours = (
                session.execute(select(BusinessHoursConfig).order_by(BusinessHoursConfig.id)).scalar_one_or_none()
            )
            runtime_map = self._settings_map(session)

            has_domain = default_domain is not None and bool(default_domain.domain_fqdn)
            has_ldap = bool(runtime_map.get("ldap_bind_dn")) and bool(runtime_map.get("ldap_bind_password"))
            has_winrm = bool(runtime_map.get("winrm_username")) and bool(runtime_map.get("winrm_password"))
            has_collectors = len(controllers) > 0
            onboarding_required = not setup_state.onboarding_completed or not (has_domain and has_ldap and has_winrm and has_collectors)

            return {
                "onboarding_required": onboarding_required,
                "onboarding_completed": setup_state.onboarding_completed,
                "completed_at_utc": setup_state.completed_at_utc.isoformat() if setup_state.completed_at_utc else None,
                "last_bootstrap_at_utc": setup_state.last_bootstrap_at_utc.isoformat() if setup_state.last_bootstrap_at_utc else None,
                "checks": {
                    "has_domain": has_domain,
                    "has_ldap_credentials": has_ldap,
                    "has_winrm_credentials": has_winrm,
                    "has_domain_controllers": has_collectors,
                },
                "prefill": {
                    "domain_name": default_domain.name if default_domain else "",
                    "domain_fqdn": default_domain.domain_fqdn if default_domain else "",
                    "ldap_server": (default_domain.ldap_server if default_domain and default_domain.ldap_server else self.settings.ldap_server) or "",
                    "ldap_base_dn": (default_domain.ldap_base_dn if default_domain and default_domain.ldap_base_dn else self.settings.ldap_base_dn) or "",
                    "ldap_bind_dn": runtime_map.get("ldap_bind_dn", self.settings.ldap_bind_dn),
                    "domain_controllers": [item.hostname for item in controllers] or self.settings.event_dc_list,
                    "winrm_username": runtime_map.get("winrm_username", self.settings.winrm_username),
                    "winrm_domain": runtime_map.get("winrm_domain", self.settings.winrm_domain),
                    "winrm_auth": runtime_map.get("winrm_auth", self.settings.winrm_auth),
                    "winrm_use_ssl": self._to_bool(runtime_map.get("winrm_use_ssl"), self.settings.winrm_use_ssl),
                    "winrm_port": self._to_int(runtime_map.get("winrm_port"), self.settings.winrm_port),
                    "business_hours_timezone": business_hours.timezone_name if business_hours else "Africa/Kampala",
                    "business_hours_start": business_hours.start_hour if business_hours else 8,
                    "business_hours_end": business_hours.end_hour if business_hours else 18,
                    "working_days": (
                        business_hours.working_days_json and json.loads(business_hours.working_days_json)
                        if business_hours
                        else ["Mon", "Tue", "Wed", "Thu", "Fri"]
                    ),
                },
            }

    def save_runtime_settings(self, payload: dict[str, Any]) -> None:
        init_db()
        now = datetime.now(timezone.utc)
        with SessionLocal() as session:
            self._ensure_setup_state(session)
            secret_keys = {"ldap_bind_password", "winrm_password"}
            for key, value in payload.items():
                row = session.execute(
                    select(RuntimeSetting).where(RuntimeSetting.setting_key == key)
                ).scalar_one_or_none()
                serialized = self._serialize_value(value)
                if row is None:
                    row = RuntimeSetting(
                        setting_key=key,
                        setting_value=serialized,
                        is_secret=key in secret_keys,
                        updated_at_utc=now,
                    )
                    session.add(row)
                else:
                    row.setting_value = serialized
                    row.is_secret = key in secret_keys
                    row.updated_at_utc = now
            session.commit()

    def mark_onboarding_complete(self) -> dict[str, Any]:
        init_db()
        now = datetime.now(timezone.utc)
        with SessionLocal() as session:
            setup_state = self._ensure_setup_state(session)
            setup_state.onboarding_completed = True
            setup_state.last_bootstrap_at_utc = now
            setup_state.completed_at_utc = setup_state.completed_at_utc or now
            session.commit()
        return self.get_setup_status()

    def effective_runtime(self) -> dict[str, Any]:
        init_db()
        with SessionLocal() as session:
            runtime_map = self._settings_map(session)
            default_domain = session.execute(
                select(MonitoredDomain).where(MonitoredDomain.is_default.is_(True))
            ).scalar_one_or_none()
            controllers = (
                session.execute(
                    select(DomainControllerConfig).where(DomainControllerConfig.is_enabled.is_(True)).order_by(DomainControllerConfig.hostname)
                )
                .scalars()
                .all()
            )

        ldap_server = runtime_map.get("ldap_server") or (default_domain.ldap_server if default_domain else None) or self.settings.ldap_server
        ldap_base_dn = runtime_map.get("ldap_base_dn") or (default_domain.ldap_base_dn if default_domain else None) or self.settings.ldap_base_dn
        event_dc_list = [item.hostname for item in controllers] or self.settings.event_dc_list

        return {
            "ldap_server": ldap_server,
            "ldap_base_dn": ldap_base_dn,
            "ldap_bind_dn": runtime_map.get("ldap_bind_dn") or self.settings.ldap_bind_dn,
            "ldap_bind_password": runtime_map.get("ldap_bind_password") or self.settings.ldap_bind_password.get_secret_value(),
            "event_dc_list": event_dc_list,
            "winrm_username": runtime_map.get("winrm_username") or self.settings.winrm_username,
            "winrm_domain": runtime_map.get("winrm_domain") or self.settings.winrm_domain,
            "winrm_password": runtime_map.get("winrm_password") or self.settings.winrm_password.get_secret_value(),
            "winrm_auth": runtime_map.get("winrm_auth") or self.settings.winrm_auth,
            "winrm_use_ssl": self._to_bool(runtime_map.get("winrm_use_ssl"), self.settings.winrm_use_ssl),
            "winrm_port": self._to_int(runtime_map.get("winrm_port"), self.settings.winrm_port),
            "winrm_server_cert_validation": runtime_map.get("winrm_server_cert_validation") or self.settings.winrm_server_cert_validation,
        }

    def _ensure_setup_state(self, session) -> SetupState:
        row = session.execute(select(SetupState).where(SetupState.id == 1)).scalar_one_or_none()
        if row is None:
            row = SetupState(
                id=1,
                onboarding_completed=False,
                completed_at_utc=None,
                last_bootstrap_at_utc=None,
            )
            session.add(row)
            session.flush()
        return row

    def _settings_map(self, session) -> dict[str, str]:
        rows = session.execute(select(RuntimeSetting)).scalars().all()
        return {row.setting_key: row.setting_value or "" for row in rows}

    def _serialize_value(self, value: Any) -> str:
        if isinstance(value, bool):
            return "true" if value else "false"
        if isinstance(value, (int, float)):
            return str(value)
        if isinstance(value, list):
            return ",".join(str(item).strip() for item in value if str(item).strip())
        return str(value).strip()

    def _to_bool(self, value: str | None, fallback: bool) -> bool:
        if value is None or value == "":
            return fallback
        return value.strip().lower() in {"1", "true", "yes", "on"}

    def _to_int(self, value: str | None, fallback: int) -> int:
        if value is None or value == "":
            return fallback
        try:
            return int(value)
        except ValueError:
            return fallback

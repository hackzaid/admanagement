from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select

from admanagement.core.config import Settings
from admanagement.db.bootstrap import init_db
from admanagement.db.session import SessionLocal
from admanagement.models.checkpoint import EventCheckpoint
from admanagement.models.configuration import (
    AlertRuleConfig,
    AuditPolicyExpectation,
    BusinessHoursConfig,
    DomainControllerConfig,
    ExcludedAccount,
    MonitoredDomain,
)


DEFAULT_ALERT_RULES = [
    {
        "key": "failed_logon_burst",
        "display_name": "Failed Logon Burst",
        "description": "Trigger when failed logons spike within a short window.",
        "severity": "high",
        "threshold": 10,
        "window_minutes": 15,
        "channels": ["in_app"],
    },
    {
        "key": "account_lockout",
        "display_name": "Account Lockout",
        "description": "Trigger on observed account lockouts.",
        "severity": "high",
        "threshold": 1,
        "window_minutes": 15,
        "channels": ["in_app"],
    },
    {
        "key": "privileged_change",
        "display_name": "Privileged Group Change",
        "description": "Highlight change activity against privileged groups and Tier 0 scope.",
        "severity": "critical",
        "threshold": 1,
        "window_minutes": 15,
        "channels": ["in_app"],
    },
    {
        "key": "destructive_change",
        "display_name": "Destructive Change",
        "description": "Highlight deletes and disruptive AD object operations.",
        "severity": "high",
        "threshold": 1,
        "window_minutes": 15,
        "channels": ["in_app"],
    },
]

DEFAULT_AUDIT_POLICIES = [
    ("directory_service_changes", "Directory Service Changes", "enabled", "Needed for who-changed-what visibility."),
    ("directory_service_access", "Directory Service Access", "enabled", "Needed for deeper object access visibility when SACLs exist."),
    ("account_management", "Account Management", "enabled", "Needed for user, group, and computer lifecycle events."),
    ("logon", "Logon/Logoff", "enabled", "Needed for logon, failure, and lockout reporting."),
    ("policy_change", "Policy Change", "enabled", "Needed for GPO and audit-policy tracking."),
]


class ConfigurationService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def overview(self) -> dict[str, Any]:
        init_db()
        with SessionLocal() as session:
            domain = self._ensure_seeded(session)
            business_hours = session.execute(
                select(BusinessHoursConfig).where(BusinessHoursConfig.domain_id == domain.id)
            ).scalar_one()
            controllers = session.execute(
                select(DomainControllerConfig).where(DomainControllerConfig.domain_id == domain.id).order_by(DomainControllerConfig.name)
            ).scalars().all()
            exclusions = session.execute(
                select(ExcludedAccount).where(ExcludedAccount.domain_id == domain.id).order_by(ExcludedAccount.principal_name)
            ).scalars().all()
            alerts = session.execute(
                select(AlertRuleConfig).where(AlertRuleConfig.domain_id == domain.id).order_by(AlertRuleConfig.display_name)
            ).scalars().all()
            policies = session.execute(
                select(AuditPolicyExpectation).where(AuditPolicyExpectation.domain_id == domain.id).order_by(AuditPolicyExpectation.display_name)
            ).scalars().all()

            last_checkpoints = self._checkpoint_map(session)

            return {
                "must_have_modules": [
                    {
                        "key": "domain_settings",
                        "title": "Domain Settings",
                        "why": "Admins need one place to confirm the monitored directory and bind settings.",
                    },
                    {
                        "key": "domain_controllers",
                        "title": "Domain Controllers",
                        "why": "Collector targets, fetch health, and event read status are operationally critical every day.",
                    },
                    {
                        "key": "audit_policy",
                        "title": "Audit Policy Baseline",
                        "why": "If the domain is not logging the right events, every report becomes partial or misleading.",
                    },
                    {
                        "key": "alerts_reports",
                        "title": "Alerts and Reports",
                        "why": "Admins tune noisy detections and the signal they actually want surfaced.",
                    },
                    {
                        "key": "business_hours",
                        "title": "Business Hours",
                        "why": "The same change outside business hours has a very different risk profile.",
                    },
                    {
                        "key": "excluded_accounts",
                        "title": "Excluded Accounts",
                        "why": "Service accounts and expected noise need controlled exclusions, not ad hoc ignoring.",
                    },
                ],
                "defer_modules": [
                    "Disk space analysis",
                    "Archive restore",
                    "Ticketing integration",
                    "SIEM integration",
                    "Personalize",
                    "Jump To",
                ],
                "domain": self._serialize_domain(domain),
                "business_hours": self._serialize_business_hours(business_hours),
                "domain_controllers": [self._serialize_controller(item, last_checkpoints) for item in controllers],
                "excluded_accounts": [self._serialize_exclusion(item) for item in exclusions],
                "alert_rules": [self._serialize_alert(item) for item in alerts],
                "audit_policy_expectations": [self._serialize_policy(item) for item in policies],
            }

    def list_domains(self) -> list[dict[str, Any]]:
        init_db()
        with SessionLocal() as session:
            self._ensure_seeded(session)
            rows = session.execute(select(MonitoredDomain).order_by(MonitoredDomain.name)).scalars().all()
            return [self._serialize_domain(item) for item in rows]

    def upsert_domain(
        self,
        *,
        name: str,
        domain_fqdn: str,
        ldap_server: str | None,
        ldap_base_dn: str | None,
        is_enabled: bool = True,
        is_default: bool = False,
        notes: str | None = None,
    ) -> dict[str, Any]:
        init_db()
        now = datetime.now(timezone.utc)
        with SessionLocal() as session:
            domain = session.execute(
                select(MonitoredDomain).where(MonitoredDomain.domain_fqdn == domain_fqdn)
            ).scalar_one_or_none()

            if is_default:
                for item in session.execute(select(MonitoredDomain)).scalars().all():
                    item.is_default = False

            if domain is None:
                domain = MonitoredDomain(
                    name=name,
                    domain_fqdn=domain_fqdn,
                    ldap_server=ldap_server,
                    ldap_base_dn=ldap_base_dn,
                    is_enabled=is_enabled,
                    is_default=is_default,
                    notes=notes,
                    created_at_utc=now,
                    updated_at_utc=now,
                )
                session.add(domain)
                session.flush()
                self._seed_domain_children(session, domain)
            else:
                domain.name = name
                domain.ldap_server = ldap_server
                domain.ldap_base_dn = ldap_base_dn
                domain.is_enabled = is_enabled
                domain.is_default = is_default
                domain.notes = notes
                domain.updated_at_utc = now

            session.commit()
            return self._serialize_domain(domain)

    def list_domain_controllers(self) -> list[dict[str, Any]]:
        init_db()
        with SessionLocal() as session:
            domain = self._ensure_seeded(session)
            rows = session.execute(
                select(DomainControllerConfig).where(DomainControllerConfig.domain_id == domain.id).order_by(DomainControllerConfig.name)
            ).scalars().all()
            checkpoints = self._checkpoint_map(session)
            return [self._serialize_controller(item, checkpoints) for item in rows]

    def upsert_domain_controller(
        self,
        *,
        hostname: str,
        name: str | None = None,
        event_fetch_interval_seconds: int = 300,
        is_enabled: bool = True,
        status: str = "configured",
    ) -> dict[str, Any]:
        init_db()
        now = datetime.now(timezone.utc)
        with SessionLocal() as session:
            domain = self._ensure_seeded(session)
            row = session.execute(
                select(DomainControllerConfig).where(DomainControllerConfig.hostname == hostname)
            ).scalar_one_or_none()
            if row is None:
                row = DomainControllerConfig(
                    domain_id=domain.id,
                    name=name or hostname.split(".")[0],
                    hostname=hostname,
                    event_fetch_interval_seconds=event_fetch_interval_seconds,
                    status=status,
                    is_enabled=is_enabled,
                    created_at_utc=now,
                    updated_at_utc=now,
                )
                session.add(row)
            else:
                row.name = name or row.name
                row.event_fetch_interval_seconds = event_fetch_interval_seconds
                row.is_enabled = is_enabled
                row.status = status
                row.updated_at_utc = now
            session.commit()
            checkpoints = self._checkpoint_map(session)
            return self._serialize_controller(row, checkpoints)

    def get_business_hours(self) -> dict[str, Any]:
        init_db()
        with SessionLocal() as session:
            domain = self._ensure_seeded(session)
            row = session.execute(
                select(BusinessHoursConfig).where(BusinessHoursConfig.domain_id == domain.id)
            ).scalar_one()
            return self._serialize_business_hours(row)

    def upsert_business_hours(
        self,
        *,
        timezone_name: str,
        start_hour: int,
        end_hour: int,
        working_days: list[str],
    ) -> dict[str, Any]:
        init_db()
        with SessionLocal() as session:
            domain = self._ensure_seeded(session)
            row = session.execute(
                select(BusinessHoursConfig).where(BusinessHoursConfig.domain_id == domain.id)
            ).scalar_one()
            row.timezone_name = timezone_name
            row.start_hour = start_hour
            row.end_hour = end_hour
            row.working_days_json = json.dumps(working_days)
            row.updated_at_utc = datetime.now(timezone.utc)
            session.commit()
            return self._serialize_business_hours(row)

    def list_excluded_accounts(self) -> list[dict[str, Any]]:
        init_db()
        with SessionLocal() as session:
            domain = self._ensure_seeded(session)
            rows = session.execute(
                select(ExcludedAccount).where(ExcludedAccount.domain_id == domain.id).order_by(ExcludedAccount.principal_name)
            ).scalars().all()
            return [self._serialize_exclusion(item) for item in rows]

    def add_excluded_account(self, *, principal_name: str, reason: str | None, is_enabled: bool = True) -> dict[str, Any]:
        init_db()
        now = datetime.now(timezone.utc)
        with SessionLocal() as session:
            domain = self._ensure_seeded(session)
            row = session.execute(
                select(ExcludedAccount).where(
                    ExcludedAccount.domain_id == domain.id,
                    ExcludedAccount.principal_name == principal_name,
                )
            ).scalar_one_or_none()
            if row is None:
                row = ExcludedAccount(
                    domain_id=domain.id,
                    principal_name=principal_name,
                    reason=reason,
                    is_enabled=is_enabled,
                    created_at_utc=now,
                    updated_at_utc=now,
                )
                session.add(row)
            else:
                row.reason = reason
                row.is_enabled = is_enabled
                row.updated_at_utc = now
            session.commit()
            return self._serialize_exclusion(row)

    def remove_excluded_account(self, item_id: int) -> None:
        init_db()
        with SessionLocal() as session:
            row = session.get(ExcludedAccount, item_id)
            if row is not None:
                session.delete(row)
                session.commit()

    def list_alert_rules(self) -> list[dict[str, Any]]:
        init_db()
        with SessionLocal() as session:
            domain = self._ensure_seeded(session)
            rows = session.execute(
                select(AlertRuleConfig).where(AlertRuleConfig.domain_id == domain.id).order_by(AlertRuleConfig.display_name)
            ).scalars().all()
            return [self._serialize_alert(item) for item in rows]

    def upsert_alert_rule(
        self,
        *,
        key: str,
        display_name: str,
        description: str | None,
        severity: str,
        threshold: int,
        window_minutes: int,
        channels: list[str],
        is_enabled: bool,
    ) -> dict[str, Any]:
        init_db()
        with SessionLocal() as session:
            domain = self._ensure_seeded(session)
            row = session.execute(
                select(AlertRuleConfig).where(AlertRuleConfig.domain_id == domain.id, AlertRuleConfig.key == key)
            ).scalar_one_or_none()
            if row is None:
                row = AlertRuleConfig(
                    domain_id=domain.id,
                    key=key,
                    display_name=display_name,
                    description=description,
                    severity=severity,
                    threshold=threshold,
                    window_minutes=window_minutes,
                    channels_json=json.dumps(channels),
                    is_enabled=is_enabled,
                    updated_at_utc=datetime.now(timezone.utc),
                )
                session.add(row)
            else:
                row.display_name = display_name
                row.description = description
                row.severity = severity
                row.threshold = threshold
                row.window_minutes = window_minutes
                row.channels_json = json.dumps(channels)
                row.is_enabled = is_enabled
                row.updated_at_utc = datetime.now(timezone.utc)
            session.commit()
            return self._serialize_alert(row)

    def list_audit_policy_expectations(self) -> list[dict[str, Any]]:
        init_db()
        with SessionLocal() as session:
            domain = self._ensure_seeded(session)
            rows = session.execute(
                select(AuditPolicyExpectation).where(AuditPolicyExpectation.domain_id == domain.id).order_by(AuditPolicyExpectation.display_name)
            ).scalars().all()
            return [self._serialize_policy(item) for item in rows]

    def upsert_audit_policy_expectation(
        self,
        *,
        item_id: int | None,
        policy_key: str,
        display_name: str,
        category: str,
        required_state: str,
        rationale: str | None,
    ) -> dict[str, Any]:
        init_db()
        with SessionLocal() as session:
            domain = self._ensure_seeded(session)
            row = session.get(AuditPolicyExpectation, item_id) if item_id else None
            if row is None:
                row = AuditPolicyExpectation(
                    domain_id=domain.id,
                    policy_key=policy_key,
                    display_name=display_name,
                    category=category,
                    required_state=required_state,
                    rationale=rationale,
                    updated_at_utc=datetime.now(timezone.utc),
                )
                session.add(row)
            else:
                row.policy_key = policy_key
                row.display_name = display_name
                row.category = category
                row.required_state = required_state
                row.rationale = rationale
                row.updated_at_utc = datetime.now(timezone.utc)
            session.commit()
            return self._serialize_policy(row)

    def _ensure_seeded(self, session) -> MonitoredDomain:
        domain = session.execute(
            select(MonitoredDomain).where(MonitoredDomain.is_default.is_(True))
        ).scalar_one_or_none()
        if domain is not None:
            self._seed_missing_children(session, domain)
            session.commit()
            return domain

        domain_fqdn = self._derive_domain_fqdn()
        now = datetime.now(timezone.utc)
        domain = MonitoredDomain(
            name=domain_fqdn or "Default Domain",
            domain_fqdn=domain_fqdn or "example.local",
            ldap_server=self.settings.ldap_server or None,
            ldap_base_dn=self.settings.ldap_base_dn or None,
            is_enabled=True,
            is_default=True,
            notes="Seeded from current application settings.",
            created_at_utc=now,
            updated_at_utc=now,
        )
        session.add(domain)
        session.flush()
        self._seed_domain_children(session, domain)
        session.commit()
        return domain

    def _seed_domain_children(self, session, domain: MonitoredDomain) -> None:
        now = datetime.now(timezone.utc)
        session.add(
            BusinessHoursConfig(
                domain_id=domain.id,
                timezone_name="Africa/Kampala",
                start_hour=8,
                end_hour=18,
                working_days_json=json.dumps(["Mon", "Tue", "Wed", "Thu", "Fri"]),
                updated_at_utc=now,
            )
        )

        for hostname in self.settings.event_dc_list:
            session.add(
                DomainControllerConfig(
                    domain_id=domain.id,
                    name=hostname.split(".")[0],
                    hostname=hostname,
                    event_fetch_interval_seconds=max(self.settings.activity_poll_interval_minutes * 60, 60),
                    status="configured",
                    is_enabled=True,
                    created_at_utc=now,
                    updated_at_utc=now,
                )
            )

        for item in DEFAULT_ALERT_RULES:
            session.add(
                AlertRuleConfig(
                    domain_id=domain.id,
                    key=item["key"],
                    display_name=item["display_name"],
                    description=item["description"],
                    severity=item["severity"],
                    threshold=item["threshold"],
                    window_minutes=item["window_minutes"],
                    channels_json=json.dumps(item["channels"]),
                    is_enabled=True,
                    updated_at_utc=now,
                )
            )

        for policy_key, display_name, required_state, rationale in DEFAULT_AUDIT_POLICIES:
            session.add(
                AuditPolicyExpectation(
                    domain_id=domain.id,
                    policy_key=policy_key,
                    display_name=display_name,
                    category="audit",
                    required_state=required_state,
                    rationale=rationale,
                    updated_at_utc=now,
                )
            )

    def _seed_missing_children(self, session, domain: MonitoredDomain) -> None:
        if session.execute(select(BusinessHoursConfig).where(BusinessHoursConfig.domain_id == domain.id)).scalar_one_or_none() is None:
            self._seed_domain_children(session, domain)
            return

        existing_hosts = {
            item.hostname
            for item in session.execute(
                select(DomainControllerConfig).where(DomainControllerConfig.domain_id == domain.id)
            ).scalars().all()
        }
        now = datetime.now(timezone.utc)
        for hostname in self.settings.event_dc_list:
            if hostname in existing_hosts:
                continue
            session.add(
                DomainControllerConfig(
                    domain_id=domain.id,
                    name=hostname.split(".")[0],
                    hostname=hostname,
                    event_fetch_interval_seconds=max(self.settings.activity_poll_interval_minutes * 60, 60),
                    status="configured",
                    is_enabled=True,
                    created_at_utc=now,
                    updated_at_utc=now,
                )
            )

    def _checkpoint_map(self, session) -> dict[str, datetime | None]:
        rows = session.execute(select(EventCheckpoint)).scalars().all()
        return {
            f"{row.checkpoint_type}:{row.source_name}": row.last_activity_time_utc
            for row in rows
        }

    def _derive_domain_fqdn(self) -> str:
        if self.settings.ldap_base_dn:
            parts: list[str] = []
            for component in self.settings.ldap_base_dn.split(","):
                key, _, value = component.partition("=")
                if key.strip().upper() == "DC" and value.strip():
                    parts.append(value.strip())
            if parts:
                return ".".join(parts)
        if self.settings.ldap_server:
            return self.settings.ldap_server.replace("ldaps://", "").replace("ldap://", "").strip("/")
        return ""

    def _serialize_domain(self, row: MonitoredDomain) -> dict[str, Any]:
        return {
            "id": row.id,
            "name": row.name,
            "domain_fqdn": row.domain_fqdn,
            "ldap_server": row.ldap_server,
            "ldap_base_dn": row.ldap_base_dn,
            "is_enabled": row.is_enabled,
            "is_default": row.is_default,
            "notes": row.notes,
            "updated_at_utc": row.updated_at_utc.isoformat(),
        }

    def _serialize_controller(self, row: DomainControllerConfig, checkpoints: dict[str, datetime | None]) -> dict[str, Any]:
        activity_key = f"activity_winrm:{row.hostname}"
        logon_key = f"logon_winrm:{row.hostname}"
        return {
            "id": row.id,
            "name": row.name,
            "hostname": row.hostname,
            "event_fetch_interval_seconds": row.event_fetch_interval_seconds,
            "status": row.status,
            "is_enabled": row.is_enabled,
            "last_activity_event_time_utc": checkpoints.get(activity_key).isoformat() if checkpoints.get(activity_key) else None,
            "last_logon_event_time_utc": checkpoints.get(logon_key).isoformat() if checkpoints.get(logon_key) else None,
            "updated_at_utc": row.updated_at_utc.isoformat(),
        }

    def _serialize_business_hours(self, row: BusinessHoursConfig) -> dict[str, Any]:
        return {
            "id": row.id,
            "timezone_name": row.timezone_name,
            "start_hour": row.start_hour,
            "end_hour": row.end_hour,
            "working_days": json.loads(row.working_days_json or "[]"),
            "updated_at_utc": row.updated_at_utc.isoformat(),
        }

    def _serialize_exclusion(self, row: ExcludedAccount) -> dict[str, Any]:
        return {
            "id": row.id,
            "principal_name": row.principal_name,
            "reason": row.reason,
            "is_enabled": row.is_enabled,
            "updated_at_utc": row.updated_at_utc.isoformat(),
        }

    def _serialize_alert(self, row: AlertRuleConfig) -> dict[str, Any]:
        return {
            "id": row.id,
            "key": row.key,
            "display_name": row.display_name,
            "description": row.description,
            "severity": row.severity,
            "threshold": row.threshold,
            "window_minutes": row.window_minutes,
            "channels": json.loads(row.channels_json or "[]"),
            "is_enabled": row.is_enabled,
            "updated_at_utc": row.updated_at_utc.isoformat(),
        }

    def _serialize_policy(self, row: AuditPolicyExpectation) -> dict[str, Any]:
        return {
            "id": row.id,
            "policy_key": row.policy_key,
            "display_name": row.display_name,
            "category": row.category,
            "required_state": row.required_state,
            "rationale": row.rationale,
            "updated_at_utc": row.updated_at_utc.isoformat(),
        }

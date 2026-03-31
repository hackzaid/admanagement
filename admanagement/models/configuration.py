from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from admanagement.db.base import Base


class MonitoredDomain(Base):
    __tablename__ = "monitored_domain"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    domain_fqdn: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    ldap_server: Mapped[str | None] = mapped_column(String(255), nullable=True)
    ldap_base_dn: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at_utc: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at_utc: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class DomainControllerConfig(Base):
    __tablename__ = "domain_controller_config"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    domain_id: Mapped[int] = mapped_column(ForeignKey("monitored_domain.id"), index=True)
    name: Mapped[str] = mapped_column(String(255), index=True)
    hostname: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    event_fetch_interval_seconds: Mapped[int] = mapped_column(Integer, default=300)
    status: Mapped[str] = mapped_column(String(64), default="configured")
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at_utc: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at_utc: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class BusinessHoursConfig(Base):
    __tablename__ = "business_hours_config"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    domain_id: Mapped[int] = mapped_column(ForeignKey("monitored_domain.id"), unique=True, index=True)
    timezone_name: Mapped[str] = mapped_column(String(64), default="UTC")
    start_hour: Mapped[int] = mapped_column(Integer, default=8)
    end_hour: Mapped[int] = mapped_column(Integer, default=18)
    working_days_json: Mapped[str] = mapped_column(Text, default='["Mon","Tue","Wed","Thu","Fri"]')
    updated_at_utc: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class ExcludedAccount(Base):
    __tablename__ = "excluded_account"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    domain_id: Mapped[int] = mapped_column(ForeignKey("monitored_domain.id"), index=True)
    principal_name: Mapped[str] = mapped_column(String(255), index=True)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at_utc: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at_utc: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class AlertRuleConfig(Base):
    __tablename__ = "alert_rule_config"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    domain_id: Mapped[int] = mapped_column(ForeignKey("monitored_domain.id"), index=True)
    key: Mapped[str] = mapped_column(String(100), index=True)
    display_name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    severity: Mapped[str] = mapped_column(String(32), default="medium")
    threshold: Mapped[int] = mapped_column(Integer, default=1)
    window_minutes: Mapped[int] = mapped_column(Integer, default=15)
    channels_json: Mapped[str] = mapped_column(Text, default='["in_app"]')
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    updated_at_utc: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class AuditPolicyExpectation(Base):
    __tablename__ = "audit_policy_expectation"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    domain_id: Mapped[int] = mapped_column(ForeignKey("monitored_domain.id"), index=True)
    policy_key: Mapped[str] = mapped_column(String(100), index=True)
    display_name: Mapped[str] = mapped_column(String(255))
    category: Mapped[str] = mapped_column(String(64), default="audit")
    required_state: Mapped[str] = mapped_column(String(32), default="enabled")
    rationale: Mapped[str | None] = mapped_column(Text, nullable=True)
    updated_at_utc: Mapped[datetime] = mapped_column(DateTime(timezone=True))

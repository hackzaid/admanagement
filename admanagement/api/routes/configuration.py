from __future__ import annotations

from pydantic import BaseModel, Field
from fastapi import APIRouter

from admanagement.core.config import get_settings
from admanagement.services.configuration_service import ConfigurationService


router = APIRouter(prefix="/configuration", tags=["configuration"])


class DomainUpsertRequest(BaseModel):
    name: str
    domain_fqdn: str
    ldap_server: str | None = None
    ldap_base_dn: str | None = None
    is_enabled: bool = True
    is_default: bool = False
    notes: str | None = None


class DomainControllerUpsertRequest(BaseModel):
    hostname: str
    name: str | None = None
    event_fetch_interval_seconds: int = Field(default=300, ge=60, le=86400)
    is_enabled: bool = True
    status: str = "configured"


class BusinessHoursUpsertRequest(BaseModel):
    timezone_name: str
    start_hour: int = Field(ge=0, le=23)
    end_hour: int = Field(ge=0, le=23)
    working_days: list[str]


class ExcludedAccountRequest(BaseModel):
    principal_name: str
    reason: str | None = None
    is_enabled: bool = True


class AlertRuleUpsertRequest(BaseModel):
    key: str
    display_name: str
    description: str | None = None
    severity: str = "medium"
    threshold: int = Field(default=1, ge=1, le=100000)
    window_minutes: int = Field(default=15, ge=1, le=1440)
    channels: list[str] = Field(default_factory=lambda: ["in_app"])
    is_enabled: bool = True


class AuditPolicyExpectationRequest(BaseModel):
    id: int | None = None
    policy_key: str
    display_name: str
    category: str = "audit"
    required_state: str = "enabled"
    rationale: str | None = None


def _service() -> ConfigurationService:
    return ConfigurationService(get_settings())


@router.get("/overview")
def configuration_overview() -> dict[str, object]:
    return _service().overview()


@router.get("/domains")
def list_domains() -> list[dict[str, object]]:
    return _service().list_domains()


@router.post("/domains")
def upsert_domain(payload: DomainUpsertRequest) -> dict[str, object]:
    return _service().upsert_domain(**payload.model_dump())


@router.get("/domain-controllers")
def list_domain_controllers() -> list[dict[str, object]]:
    return _service().list_domain_controllers()


@router.post("/domain-controllers")
def upsert_domain_controller(payload: DomainControllerUpsertRequest) -> dict[str, object]:
    return _service().upsert_domain_controller(**payload.model_dump())


@router.get("/business-hours")
def get_business_hours() -> dict[str, object]:
    return _service().get_business_hours()


@router.put("/business-hours")
def upsert_business_hours(payload: BusinessHoursUpsertRequest) -> dict[str, object]:
    return _service().upsert_business_hours(**payload.model_dump())


@router.get("/excluded-accounts")
def list_excluded_accounts() -> list[dict[str, object]]:
    return _service().list_excluded_accounts()


@router.post("/excluded-accounts")
def add_excluded_account(payload: ExcludedAccountRequest) -> dict[str, object]:
    return _service().add_excluded_account(**payload.model_dump())


@router.delete("/excluded-accounts/{item_id}")
def remove_excluded_account(item_id: int) -> dict[str, bool]:
    _service().remove_excluded_account(item_id)
    return {"ok": True}


@router.get("/alert-rules")
def list_alert_rules() -> list[dict[str, object]]:
    return _service().list_alert_rules()


@router.post("/alert-rules")
def upsert_alert_rule(payload: AlertRuleUpsertRequest) -> dict[str, object]:
    return _service().upsert_alert_rule(**payload.model_dump())


@router.get("/audit-policy")
def list_audit_policy_expectations() -> list[dict[str, object]]:
    return _service().list_audit_policy_expectations()


@router.post("/audit-policy")
def upsert_audit_policy_expectation(payload: AuditPolicyExpectationRequest) -> dict[str, object]:
    return _service().upsert_audit_policy_expectation(
        item_id=payload.id,
        policy_key=payload.policy_key,
        display_name=payload.display_name,
        category=payload.category,
        required_state=payload.required_state,
        rationale=payload.rationale,
    )

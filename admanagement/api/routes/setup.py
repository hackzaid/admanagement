from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel, Field

from admanagement.core.config import get_settings
from admanagement.services.setup_service import SetupService


router = APIRouter(prefix="/setup", tags=["setup"])


class SetupBootstrapRequest(BaseModel):
    domain_name: str
    domain_fqdn: str
    ldap_server: str
    ldap_base_dn: str
    ldap_bind_dn: str
    ldap_bind_password: str
    domain_controllers: list[str]
    winrm_username: str
    winrm_domain: str
    winrm_password: str
    winrm_auth: str = "ntlm"
    winrm_use_ssl: bool = True
    winrm_port: int = Field(default=5986, ge=1, le=65535)
    business_hours_timezone: str = "Africa/Kampala"
    business_hours_start: int = Field(default=8, ge=0, le=23)
    business_hours_end: int = Field(default=18, ge=0, le=23)
    working_days: list[str] = Field(default_factory=lambda: ["Mon", "Tue", "Wed", "Thu", "Fri"])


class LdapTestRequest(BaseModel):
    ldap_server: str
    ldap_bind_dn: str
    ldap_bind_password: str


class WinrmTestRequest(BaseModel):
    hostname: str
    winrm_username: str
    winrm_domain: str = ""
    winrm_password: str
    winrm_auth: str = "ntlm"
    winrm_use_ssl: bool = True
    winrm_port: int = Field(default=5986, ge=1, le=65535)


def _service() -> SetupService:
    return SetupService(get_settings())


@router.get("/status")
def setup_status() -> dict[str, object]:
    return _service().status()


@router.post("/bootstrap")
def setup_bootstrap(payload: SetupBootstrapRequest) -> dict[str, object]:
    return _service().bootstrap(**payload.model_dump())


@router.post("/test-ldap")
def setup_test_ldap(payload: LdapTestRequest) -> dict[str, object]:
    return _service().test_ldap(**payload.model_dump())


@router.post("/test-winrm")
def setup_test_winrm(payload: WinrmTestRequest) -> dict[str, object]:
    return _service().test_winrm(**payload.model_dump())

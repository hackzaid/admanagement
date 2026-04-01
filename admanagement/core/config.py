from __future__ import annotations

from functools import lru_cache

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="ADMANAGEMENT_",
        extra="ignore",
    )

    app_name: str = "admanagement"
    environment: str = "dev"
    debug: bool = False
    host: str = "0.0.0.0"
    port: int = 8000

    database_url: str = "sqlite+pysqlite:///./admanagement.db"
    redis_url: str = "redis://localhost:6379/0"

    ldap_server: str = "ldaps://dc01.example.local"
    ldap_bind_dn: str = ""
    ldap_bind_password: SecretStr = SecretStr("")
    ldap_base_dn: str = ""
    ldap_page_size: int = 500
    ldap_connect_timeout: int = 15
    ldap_privileged_groups: list[str] = Field(
        default_factory=lambda: [
            "Domain Admins",
            "Enterprise Admins",
            "Administrators",
            "DnsAdmins",
            "Group Policy Creator Owners",
        ]
    )

    event_ingestor_mode: str = "winrm"
    event_dc_list: list[str] = Field(default_factory=list)
    event_window_minutes: int = 5
    event_overlap_seconds: int = 60
    event_max_records_per_poll: int = 1000
    event_skip_origin_correlation: bool = False
    winrm_username: str = ""
    winrm_domain: str = ""
    winrm_password: SecretStr = SecretStr("")
    winrm_auth: str = "ntlm"
    winrm_use_ssl: bool = True
    winrm_port: int = 5986
    winrm_server_cert_validation: str = "ignore"
    winrm_operation_timeout: int = 60
    winrm_read_timeout: int = 180

    report_output_dir: str = "admanagement-data/reports"
    scheduler_enabled: bool = True
    ldap_snapshot_interval_minutes: int = 60
    activity_poll_interval_minutes: int = 5
    logon_poll_interval_minutes: int = 5
    dashboard_recent_activity_limit: int = 20
    frontend_origins: list[str] = Field(default_factory=lambda: ["http://127.0.0.1:3000", "http://localhost:3000"])
    update_check_enabled: bool = True
    update_check_interval_minutes: int = 360
    update_repository: str = "hackzaid/admanagement"
    update_channel: str = "branch"
    update_branch: str = "main"
    update_github_token: SecretStr = SecretStr("")
    update_deploy_mode: str = "docker-compose"
    build_commit: str = ""
    update_apply_enabled: bool = False
    update_host_project_path: str = "/host/app"
    update_runner_image: str = "admanagement-backend"
    auth_session_hours: int = 12


@lru_cache
def get_settings() -> Settings:
    return Settings()

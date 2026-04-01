from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

from ldap3 import ALL, Connection, Server
from sqlalchemy import select

from admanagement.core.config import Settings
from admanagement.db.bootstrap import init_db
from admanagement.db.session import SessionLocal
from admanagement.models.auth_session import AuthSession
from admanagement.services.runtime_config import RuntimeConfigService


class AuthenticationError(Exception):
    pass


class AuthService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.runtime_service = RuntimeConfigService(settings)

    def authenticate(self, username: str, password: str) -> dict[str, Any]:
        normalized = self._normalize_username(username)
        if not normalized or not password:
            raise AuthenticationError("Username and password are required.")

        runtime = self.runtime_service.effective_runtime()
        ldap_server = runtime.get("ldap_server") or self.settings.ldap_server
        bind_dn = runtime.get("ldap_bind_dn") or self.settings.ldap_bind_dn
        bind_password = runtime.get("ldap_bind_password") or self.settings.ldap_bind_password.get_secret_value()
        base_dn = runtime.get("ldap_base_dn") or self.settings.ldap_base_dn

        if not ldap_server or not bind_dn or not bind_password or not base_dn:
            raise AuthenticationError("Directory authentication is not configured.")

        server = Server(ldap_server, get_info=ALL, connect_timeout=self.settings.ldap_connect_timeout)
        service_connection = Connection(server, user=bind_dn, password=bind_password, auto_bind=True)
        try:
            search_filter = f"(&(objectClass=user)(sAMAccountName={self._escape_ldap_filter(normalized)}))"
            found = service_connection.search(
                search_base=base_dn,
                search_filter=search_filter,
                attributes=["displayName", "distinguishedName", "userPrincipalName", "sAMAccountName"],
                size_limit=1,
            )
            if not found or not service_connection.entries:
                raise AuthenticationError("Invalid username or password.")

            entry = service_connection.entries[0]
            user_dn = str(entry.entry_dn)
            display_name = str(entry.displayName.value) if getattr(entry, "displayName", None) and entry.displayName.value else normalized
            user_principal_name = (
                str(entry.userPrincipalName.value)
                if getattr(entry, "userPrincipalName", None) and entry.userPrincipalName.value
                else None
            )

            if not self._try_user_bind(server, user_dn, password):
                if not user_principal_name or not self._try_user_bind(server, user_principal_name, password):
                    raise AuthenticationError("Invalid username or password.")
        finally:
            service_connection.unbind()

        session = self.create_session(
            username=normalized,
            display_name=display_name,
            distinguished_name=user_dn,
        )
        return {
            "username": normalized,
            "display_name": display_name,
            "distinguished_name": user_dn,
            **session,
        }

    def create_session(self, *, username: str, display_name: str | None, distinguished_name: str | None) -> dict[str, Any]:
        init_db()
        raw_token = secrets.token_urlsafe(32)
        token_hash = self._hash_token(raw_token)
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(hours=self.settings.auth_session_hours)

        with SessionLocal() as session:
            row = AuthSession(
                token_hash=token_hash,
                username=username,
                display_name=display_name,
                distinguished_name=distinguished_name,
                is_active=True,
                created_at_utc=now,
                updated_at_utc=now,
                expires_at_utc=expires_at,
            )
            session.add(row)
            session.commit()

        return {
            "token": raw_token,
            "expires_at_utc": expires_at.isoformat(),
        }

    def get_session(self, token: str) -> dict[str, Any] | None:
        if not token:
            return None
        init_db()
        now = datetime.now(timezone.utc)
        with SessionLocal() as session:
            row = session.execute(
                select(AuthSession).where(AuthSession.token_hash == self._hash_token(token))
            ).scalar_one_or_none()
            if row is None or not row.is_active or row.expires_at_utc <= now:
                return None

            row.updated_at_utc = now
            session.commit()
            return {
                "username": row.username,
                "display_name": row.display_name or row.username,
                "distinguished_name": row.distinguished_name,
                "expires_at_utc": row.expires_at_utc.isoformat(),
            }

    def revoke_session(self, token: str) -> bool:
        if not token:
            return False
        init_db()
        now = datetime.now(timezone.utc)
        with SessionLocal() as session:
            row = session.execute(
                select(AuthSession).where(AuthSession.token_hash == self._hash_token(token))
            ).scalar_one_or_none()
            if row is None:
                return False
            row.is_active = False
            row.updated_at_utc = now
            session.commit()
            return True

    def _try_user_bind(self, server: Server, user: str, password: str) -> bool:
        connection = Connection(server, user=user, password=password)
        try:
            return connection.bind()
        finally:
            connection.unbind()

    def _normalize_username(self, value: str) -> str:
        cleaned = value.strip()
        if "\\" in cleaned:
            cleaned = cleaned.split("\\", 1)[1]
        if "@" in cleaned:
            cleaned = cleaned.split("@", 1)[0]
        return cleaned

    def _hash_token(self, token: str) -> str:
        return hashlib.sha256(token.encode("utf-8")).hexdigest()

    def _escape_ldap_filter(self, value: str) -> str:
        replacements = {
            "\\": r"\5c",
            "*": r"\2a",
            "(": r"\28",
            ")": r"\29",
            "\x00": r"\00",
        }
        return "".join(replacements.get(char, char) for char in value)

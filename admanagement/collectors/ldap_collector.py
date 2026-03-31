from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from uuid import uuid4

from ldap3 import ALL, BASE, SUBTREE, Connection, Server

from admanagement.core.config import Settings
from admanagement.db.bootstrap import init_db
from admanagement.db.session import SessionLocal
from admanagement.models.snapshot import DirectorySnapshot
from admanagement.services.runtime_config import RuntimeConfigService


USER_FILTER = "(&(objectCategory=person)(objectClass=user))"
COMPUTER_FILTER = "(objectClass=computer)"
GROUP_FILTER = "(objectClass=group)"

PRIVILEGED_ATTRIBUTES = [
    "cn",
    "sAMAccountName",
    "distinguishedName",
    "member",
    "whenCreated",
    "whenChanged",
]

SEARCH_PLANS: tuple[tuple[str, str, list[str]], ...] = (
    (
        "user",
        USER_FILTER,
        [
            "displayName",
            "sAMAccountName",
            "userPrincipalName",
            "distinguishedName",
            "mail",
            "memberOf",
            "userAccountControl",
            "whenCreated",
            "whenChanged",
            "lastLogonTimestamp",
            "pwdLastSet",
        ],
    ),
    (
        "computer",
        COMPUTER_FILTER,
        [
            "name",
            "dNSHostName",
            "distinguishedName",
            "operatingSystem",
            "operatingSystemVersion",
            "whenCreated",
            "whenChanged",
            "lastLogonTimestamp",
            "userAccountControl",
        ],
    ),
    (
        "group",
        GROUP_FILTER,
        [
            "cn",
            "sAMAccountName",
            "distinguishedName",
            "groupType",
            "member",
            "whenCreated",
            "whenChanged",
        ],
    ),
)


@dataclass(slots=True)
class LdapSnapshotResult:
    run_id: str
    captured_at_utc: str
    base_dn: str
    page_size: int
    connected: bool
    persisted_rows: int
    counts: dict[str, int]


class LdapCollector:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.runtime = RuntimeConfigService(settings)

    def test_connection(self) -> LdapSnapshotResult:
        effective = self.runtime.effective_runtime()
        connection = self._connect()
        try:
            return LdapSnapshotResult(
                run_id="connection-test",
                captured_at_utc=datetime.now(timezone.utc).isoformat(),
                base_dn=effective["ldap_base_dn"],
                page_size=self.settings.ldap_page_size,
                connected=connection.bound,
                persisted_rows=0,
                counts={},
            )
        finally:
            connection.unbind()

    def run_snapshot(self) -> dict[str, object]:
        captured_at = datetime.now(timezone.utc)
        run_id = captured_at.strftime("%Y%m%d%H%M%S") + "-" + uuid4().hex[:10]
        counts: dict[str, int] = {}
        persisted_rows = 0
        effective = self.runtime.effective_runtime()

        init_db()

        connection = self._connect()
        try:
            with SessionLocal() as session:
                for object_type, search_filter, attributes in SEARCH_PLANS:
                    entries = self._paged_search(
                        connection=connection,
                        search_base=effective["ldap_base_dn"],
                        search_filter=search_filter,
                        attributes=attributes,
                    )
                    counts[object_type] = len(entries)

                    for entry in entries:
                        normalized = self._normalize_entry(entry["attributes"])
                        object_name = self._resolve_object_name(object_type, normalized)
                        distinguished_name = str(normalized.get("distinguishedName", ""))

                        session.add(
                            DirectorySnapshot(
                                run_id=run_id,
                                snapshot_type="ldap_snapshot",
                                object_type=object_type,
                                object_name=object_name,
                                distinguished_name=distinguished_name or None,
                                captured_at_utc=captured_at,
                                payload_json=json.dumps(normalized, ensure_ascii=True, sort_keys=True),
                            )
                        )
                        persisted_rows += 1

                privileged_entries = self._collect_privileged_groups(connection)
                counts["privileged_group"] = len(privileged_entries)
                for entry in privileged_entries:
                    normalized = self._normalize_entry(entry["attributes"])
                    object_name = self._resolve_object_name("privileged_group", normalized)
                    distinguished_name = str(normalized.get("distinguishedName", ""))

                    session.add(
                        DirectorySnapshot(
                            run_id=run_id,
                            snapshot_type="ldap_snapshot",
                            object_type="privileged_group",
                            object_name=object_name,
                            distinguished_name=distinguished_name or None,
                            captured_at_utc=captured_at,
                            payload_json=json.dumps(normalized, ensure_ascii=True, sort_keys=True),
                        )
                    )
                    persisted_rows += 1

                session.commit()
        finally:
            connection.unbind()

        result = LdapSnapshotResult(
            run_id=run_id,
            captured_at_utc=captured_at.isoformat(),
            base_dn=effective["ldap_base_dn"],
            page_size=self.settings.ldap_page_size,
            connected=True,
            persisted_rows=persisted_rows,
            counts=counts,
        )
        return {
            "collector": "ldap",
            "run_id": result.run_id,
            "captured_at_utc": result.captured_at_utc,
            "base_dn": result.base_dn,
            "page_size": result.page_size,
            "connected": result.connected,
            "persisted_rows": result.persisted_rows,
            "counts": result.counts,
        }

    def _connect(self) -> Connection:
        effective = self.runtime.effective_runtime()
        server = Server(
            effective["ldap_server"],
            get_info=ALL,
            connect_timeout=self.settings.ldap_connect_timeout,
        )
        connection = Connection(
            server,
            user=effective["ldap_bind_dn"],
            password=effective["ldap_bind_password"],
            auto_bind=True,
        )
        return connection

    def _paged_search(
        self,
        connection: Connection,
        search_base: str,
        search_filter: str,
        attributes: list[str],
        search_scope: int = SUBTREE,
    ) -> list[dict[str, object]]:
        records: list[dict[str, object]] = []
        results = connection.extend.standard.paged_search(
            search_base=search_base,
            search_filter=search_filter,
            search_scope=search_scope,
            attributes=attributes,
            paged_size=self.settings.ldap_page_size,
            generator=False,
        )
        for item in results:
            if item.get("type") != "searchResEntry":
                continue
            records.append(item)
        return records

    def _collect_privileged_groups(self, connection: Connection) -> list[dict[str, object]]:
        effective = self.runtime.effective_runtime()
        entries: list[dict[str, object]] = []
        for group_name in self.settings.ldap_privileged_groups:
            escaped_name = group_name.replace("\\", "\\5c").replace("(", "\\28").replace(")", "\\29")
            group_entries = self._paged_search(
                connection=connection,
                search_base=effective["ldap_base_dn"],
                search_filter=f"(&(objectClass=group)(cn={escaped_name}))",
                attributes=PRIVILEGED_ATTRIBUTES,
                search_scope=SUBTREE,
            )
            entries.extend(group_entries)
        return entries

    def _normalize_entry(self, attributes: dict[str, object]) -> dict[str, object]:
        normalized: dict[str, object] = {}
        for key, value in attributes.items():
            normalized[key] = self._normalize_value(value)
        return normalized

    def _normalize_value(self, value: object) -> object:
        if isinstance(value, datetime):
            if value.tzinfo is None:
                value = value.replace(tzinfo=timezone.utc)
            return value.astimezone(timezone.utc).isoformat()
        if isinstance(value, bytes):
            return value.decode("utf-8", errors="replace")
        if isinstance(value, list):
            return [self._normalize_value(item) for item in value]
        if value is None:
            return ""
        return str(value)

    def _resolve_object_name(self, object_type: str, attributes: dict[str, object]) -> str:
        candidates: list[str]
        if object_type == "user":
            candidates = ["sAMAccountName", "displayName", "userPrincipalName", "distinguishedName"]
        elif object_type == "computer":
            candidates = ["dNSHostName", "name", "distinguishedName"]
        else:
            candidates = ["sAMAccountName", "cn", "distinguishedName"]

        for key in candidates:
            value = attributes.get(key)
            if isinstance(value, list):
                if value:
                    return str(value[0])
                continue
            if value:
                return str(value)
        return "unknown"

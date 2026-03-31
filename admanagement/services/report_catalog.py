from __future__ import annotations

from typing import Any


REPORT_CATALOG: list[dict[str, Any]] = [
    {
        "key": "user-logon-reports",
        "title": "User Logon Reports",
        "category": "Identity Access",
        "href": "/reports/user-logon-reports",
        "capability": "activity",
    },
    {
        "key": "local-logon-logoff",
        "title": "Local Logon-Logoff",
        "category": "Endpoint Access",
        "href": "/reports/local-logon-logoff",
        "capability": "activity",
    },
    {
        "key": "all-ad-changes",
        "title": "All AD Changes",
        "category": "Account Management",
        "href": "/reports/account-management/all-ad-changes",
        "capability": "activity",
    },
    {
        "key": "all-ad-changes-by-user",
        "title": "All AD Changes By User",
        "category": "Account Management",
        "href": "/reports/account-management/all-ad-changes-by-user",
        "capability": "activity",
    },
    {
        "key": "all-ad-changes-on-dcs",
        "title": "All AD Changes on DCs",
        "category": "Account Management",
        "href": "/reports/account-management/all-ad-changes-on-dcs",
        "capability": "activity",
    },
    {
        "key": "administrative-user-actions",
        "title": "Administrative User Actions",
        "category": "Operator Oversight",
        "href": "/reports/account-management/administrative-user-actions",
        "capability": "activity",
    },
    {
        "key": "user-management",
        "title": "User Management",
        "category": "Identity Objects",
        "href": "/reports/user-management",
        "capability": "mixed",
    },
    {
        "key": "group-management",
        "title": "Group Management",
        "category": "Identity Objects",
        "href": "/reports/group-management",
        "capability": "mixed",
    },
    {
        "key": "computer-management",
        "title": "Computer Management",
        "category": "Identity Objects",
        "href": "/reports/computer-management",
        "capability": "mixed",
    },
    {
        "key": "ou-management",
        "title": "OU Management",
        "category": "Directory Structure",
        "href": "/reports/ou-management",
        "capability": "activity",
    },
    {
        "key": "gpo-management",
        "title": "GPO Management",
        "category": "Policy Control",
        "href": "/reports/gpo-management",
        "capability": "activity",
    },
    {
        "key": "gpo-setting-changes",
        "title": "GPO Setting Changes",
        "category": "Policy Control",
        "href": "/reports/gpo-setting-changes",
        "capability": "activity",
    },
    {
        "key": "permission-changes",
        "title": "Permission Changes",
        "category": "Access Control",
        "href": "/reports/permission-changes",
        "capability": "activity",
    },
    {
        "key": "configuration-auditing",
        "title": "Configuration Auditing",
        "category": "Compliance",
        "href": "/reports/configuration-auditing",
        "capability": "snapshot",
    },
    {
        "key": "dns-changes",
        "title": "DNS Changes",
        "category": "Infrastructure",
        "href": "/reports/dns-changes",
        "capability": "activity",
    },
]

SAVED_REPORTS: list[dict[str, Any]] = [
    {"key": "user-logon-reports", "label": "User Logon Reports", "href": "/reports/user-logon-reports"},
    {"key": "local-logon-logoff", "label": "Local Logon-Logoff", "href": "/reports/local-logon-logoff"},
    {"key": "all-ad-changes", "label": "All AD Changes", "href": "/reports/account-management/all-ad-changes"},
    {
        "key": "administrative-user-actions",
        "label": "Administrative User Actions",
        "href": "/reports/account-management/administrative-user-actions",
    },
    {"key": "user-management", "label": "User Management", "href": "/reports/user-management"},
    {"key": "group-management", "label": "Privileged Group Oversight", "href": "/reports/group-management"},
    {"key": "dns-changes", "label": "DNS Changes", "href": "/reports/dns-changes"},
]


class ReportCatalogService:
    def list_catalog(self) -> list[dict[str, Any]]:
        return REPORT_CATALOG

    def list_saved_reports(self) -> list[dict[str, Any]]:
        return SAVED_REPORTS

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ConfigurationOverview } from "@/lib/api";

const entries = [
  { href: "/configuration", label: "Overview", key: "overview" },
  { href: "/configuration/domain-settings", label: "Domain Settings", key: "domain" },
  { href: "/configuration/business-hours", label: "Business Hours", key: "hours" },
  { href: "/configuration/domain-controllers", label: "Domain Controllers", key: "controllers" },
  { href: "/configuration/audit-policy", label: "Audit Policy", key: "policy" },
  { href: "/configuration/alert-rules", label: "Alert Rules", key: "alerts" },
  { href: "/configuration/excluded-accounts", label: "Excluded Accounts", key: "excluded" },
];

export function ConfigurationNav({ overview }: { overview: ConfigurationOverview }) {
  const pathname = usePathname();
  const enabledControllers = overview.domain_controllers.filter((item) => item.is_enabled).length;
  const enabledAlerts = overview.alert_rules.filter((item) => item.is_enabled).length;
  const enabledExclusions = overview.excluded_accounts.filter((item) => item.is_enabled).length;

  const counts: Record<string, string> = {
    overview: overview.domain.domain_fqdn,
    domain: overview.domain.is_enabled ? "Live" : "Disabled",
    hours: `${String(overview.business_hours.start_hour).padStart(2, "0")}:00-${String(overview.business_hours.end_hour).padStart(2, "0")}:00`,
    controllers: `${enabledControllers}`,
    policy: `${overview.audit_policy_expectations.length}`,
    alerts: `${enabledAlerts}`,
    excluded: `${enabledExclusions}`,
  };

  return (
    <section className="panel config-hub-nav">
      {entries.map((entry) => (
        <Link
          className={`config-hub-link${pathname === entry.href ? " config-hub-link-active" : ""}`}
          href={entry.href}
          key={entry.href}
        >
          <span className="config-hub-label">{entry.label}</span>
          <span className="config-hub-count">{counts[entry.key]}</span>
        </Link>
      ))}
    </section>
  );
}

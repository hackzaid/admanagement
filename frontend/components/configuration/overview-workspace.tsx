import Link from "next/link";

import { SectionPanel, StatCard } from "@/components/cards";
import { ConfigurationOverview } from "@/lib/api";

import { ConfigurationShell } from "./config-shell";

function formatHours(startHour: number, endHour: number) {
  return `${String(startHour).padStart(2, "0")}:00-${String(endHour).padStart(2, "0")}:00`;
}

export function ConfigurationOverviewWorkspace({ overview }: { overview: ConfigurationOverview }) {
  const enabledControllers = overview.domain_controllers.filter((item) => item.is_enabled).length;
  const enabledAlerts = overview.alert_rules.filter((item) => item.is_enabled).length;

  const cards = [
    {
      href: "/configuration/domain-settings",
      title: "Domain Settings",
      detail: overview.domain.domain_fqdn,
      meta: overview.domain.ldap_server || overview.domain.name,
    },
    {
      href: "/configuration/business-hours",
      title: "Business Hours",
      detail: formatHours(overview.business_hours.start_hour, overview.business_hours.end_hour),
      meta: overview.business_hours.timezone_name,
    },
    {
      href: "/configuration/domain-controllers",
      title: "Domain Controllers",
      detail: `${enabledControllers} active`,
      meta: `${overview.domain_controllers.length} configured`,
    },
    {
      href: "/configuration/audit-policy",
      title: "Audit Policy",
      detail: `${overview.audit_policy_expectations.length} checks`,
      meta: "Logging prerequisites",
    },
    {
      href: "/configuration/alert-rules",
      title: "Alert Rules",
      detail: `${enabledAlerts} enabled`,
      meta: `${overview.alert_rules.length} total`,
    },
    {
      href: "/configuration/excluded-accounts",
      title: "Excluded Accounts",
      detail: `${overview.excluded_accounts.length} records`,
      meta: "Controlled suppressions",
    },
  ];

  return (
    <ConfigurationShell
      overview={overview}
      subtitle="Choose a configuration area. Each operational function lives on its own page to keep editing focused."
      title="Configuration"
    >
      <section className="card-grid card-grid-four">
        <StatCard label="Configured domain" value={overview.domain.domain_fqdn} hint={overview.domain.name} />
        <StatCard label="Active controllers" value={enabledControllers} hint="Enabled collector targets" tone="accent" />
        <StatCard label="Alert rules" value={enabledAlerts} hint="Enabled operational alerts" />
        <StatCard
          hint="Controlled suppressions"
          label="Excluded accounts"
          tone="alert"
          value={overview.excluded_accounts.filter((item) => item.is_enabled).length}
        />
      </section>

      <SectionPanel kicker="Focused administration" title="Configuration Modules">
        <section className="config-overview-grid">
          {cards.map((card) => (
            <Link className="config-overview-card" href={card.href} key={card.href}>
              <span className="config-overview-title">{card.title}</span>
              <strong className="config-overview-detail">{card.detail}</strong>
              <span className="config-overview-meta">{card.meta}</span>
            </Link>
          ))}
        </section>
      </SectionPanel>
    </ConfigurationShell>
  );
}

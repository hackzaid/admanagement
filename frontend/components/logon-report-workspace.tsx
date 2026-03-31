"use client";

import { AppShell } from "@/components/app-shell";
import { HorizontalBars } from "@/components/charts";
import { PaginationFooter, TablePanel, usePagination } from "@/components/configuration/paginated-table";
import { SectionPanel, StatCard } from "@/components/cards";
import { LogonQueryResult, LogonSummary, SnapshotSummary, buildLogonExportUrl } from "@/lib/api";
import { formatDisplayDateTime } from "@/lib/datetime";
import { formatPrincipalDisplay } from "@/lib/identity";
import { ReportDefinition } from "@/lib/navigation";

function countBy<T>(items: T[], getKey: (item: T) => string) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = getKey(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

export function LogonReportWorkspace({
  report,
  snapshotSummary,
  logonSummary,
  queryResult,
  filters,
}: {
  report: ReportDefinition;
  snapshotSummary: SnapshotSummary;
  logonSummary: LogonSummary;
  queryResult: LogonQueryResult;
  filters: {
    actor?: string;
    domainController?: string;
    search?: string;
    startTimeUtc?: string;
    endTimeUtc?: string;
    eventTypes?: Array<"Logon" | "Logoff" | "LogonFailure" | "AccountLockout">;
  };
}) {
  const rows = queryResult.rows;
  const pagination = usePagination(rows, 10);
  const eventCounts = logonSummary.event_counts ?? {};
  const logonCount = eventCounts.Logon ?? rows.filter((row) => row.event_type === "Logon").length;
  const logoffCount = eventCounts.Logoff ?? rows.filter((row) => row.event_type === "Logoff").length;
  const failureCount = eventCounts.LogonFailure ?? rows.filter((row) => row.event_type === "LogonFailure").length;
  const lockoutCount = eventCounts.AccountLockout ?? rows.filter((row) => row.event_type === "AccountLockout").length;

  const topUsers = countBy(rows, (row) => formatPrincipalDisplay(row.actor)).slice(0, 8);
  const sourceHosts = countBy(rows, (row) => row.source_workstation || row.source_ip_address || "Unknown").slice(0, 8);
  const eventMix = countBy(rows, (row) => row.event_type).slice(0, 6);
  const failureSources = countBy(
    rows.filter((row) => row.event_type === "LogonFailure" || row.event_type === "AccountLockout"),
    (row) => row.source_workstation || row.source_ip_address || "Unknown",
  ).slice(0, 8);
  const exportUrl = buildLogonExportUrl({
    actor: filters.actor,
    domainController: filters.domainController,
    search: filters.search,
    startTimeUtc: filters.startTimeUtc,
    endTimeUtc: filters.endTimeUtc,
    eventTypes: filters.eventTypes,
  });

  return (
    <AppShell title={report.title} subtitle={report.description} eyebrow={report.category}>
      <section className="report-filter-bar panel">
        <div className="filter-pair">
          <span className="filter-label">Domain</span>
          <strong>Active Directory</strong>
        </div>
        <div className="filter-pair">
          <span className="filter-label">Mode</span>
          <strong>{report.key === "local-logon-logoff" ? "Session flow" : "Authentication risk"}</strong>
        </div>
        <div className="filter-pair">
          <span className="filter-label">Rows in scope</span>
          <strong>{queryResult.total_count}</strong>
        </div>
      </section>

      <section className="report-filter-bar panel">
        <div className="filter-pair">
          <span className="filter-label">Actor filter</span>
          <strong>{filters.actor || "All users"}</strong>
        </div>
        <div className="filter-pair">
          <span className="filter-label">Search</span>
          <strong>{filters.search || "No text filter"}</strong>
        </div>
        <div className="filter-pair">
          <span className="filter-label">Export</span>
          <div className="filter-actions">
            <strong>{formatDisplayDateTime(logonSummary.latest_activity_time_utc, "No data yet")}</strong>
            <a className="filter-export" href={exportUrl} target="_blank" rel="noreferrer">
              Export CSV
            </a>
          </div>
        </div>
      </section>

      <section className="card-grid card-grid-four">
        <StatCard
          label={report.key === "local-logon-logoff" ? "Stored sessions" : "Stored auth events"}
          value={logonSummary.total_count}
          hint="Persisted authentication rows"
        />
        <StatCard label="Visible rows" value={rows.length} hint="Filtered for this report" tone="accent" />
        <StatCard
          label={report.key === "local-logon-logoff" ? "Logons" : "Failures"}
          value={report.key === "local-logon-logoff" ? logonCount : failureCount}
          hint={report.key === "local-logon-logoff" ? "Successful sign-ins observed" : "Failed sign-ins observed"}
        />
        <StatCard
          label={report.key === "local-logon-logoff" ? "Logoffs" : "Lockouts"}
          value={report.key === "local-logon-logoff" ? logoffCount : lockoutCount}
          hint={report.key === "local-logon-logoff" ? "Session closes observed" : "Locked accounts in scope"}
          tone="alert"
        />
      </section>

      <section className="two-column">
        <SectionPanel title="Top users" kicker={report.key === "local-logon-logoff" ? "Observed session activity" : "Observed identity activity"}>
          <HorizontalBars data={topUsers} />
        </SectionPanel>
        <SectionPanel title={report.key === "local-logon-logoff" ? "Source workstations" : "Event mix"} kicker={report.key === "local-logon-logoff" ? "Execution origin" : "Type distribution"}>
          <HorizontalBars tone="amber" data={report.key === "local-logon-logoff" ? sourceHosts : eventMix} />
        </SectionPanel>
      </section>

      {report.key === "user-logon-reports" ? (
        <section className="two-column">
          <SectionPanel title="Top failure sources" kicker="Lockouts and failed sign-ins">
            <HorizontalBars tone="amber" data={failureSources.length ? failureSources : logonSummary.top_failure_sources?.map((item) => ({ label: item.source, value: item.count })) ?? []} />
          </SectionPanel>
          <SectionPanel title="Snapshot context" kicker="Credential hygiene backdrop">
            <div className="bars">
              <div className="bar-row">
                <div className="bar-copy">
                  <div className="bar-label">Stale users</div>
                </div>
                <div className="bar-track">
                  <div className="bar-fill bar-fill-blue" style={{ width: "100%" }} />
                </div>
                <div className="bar-value">{snapshotSummary.findings?.stale_users?.count ?? 0}</div>
              </div>
              <div className="bar-row">
                <div className="bar-copy">
                  <div className="bar-label">Password never expires</div>
                </div>
                <div className="bar-track">
                  <div className="bar-fill bar-fill-amber" style={{ width: "100%" }} />
                </div>
                <div className="bar-value">{snapshotSummary.findings?.password_never_expires?.count ?? 0}</div>
              </div>
            </div>
          </SectionPanel>
        </section>
      ) : null}

      <SectionPanel title="Detailed authentication rows" kicker="Recent identity access events">
        <TablePanel
          table={
            <table className="data-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>User</th>
                  <th>Event</th>
                  <th>Source Workstation</th>
                  <th>Source IP</th>
                  <th>Logon Type</th>
                  <th>Auth</th>
                  <th>DC</th>
                </tr>
              </thead>
              <tbody>
                {pagination.pagedRows.map((row) => (
                  <tr key={`${row.id}-${row.event_record_id ?? row.time_utc}`}>
                    <td>{formatDisplayDateTime(row.time_utc)}</td>
                    <td>{formatPrincipalDisplay(row.actor)}</td>
                    <td>{row.event_type}</td>
                    <td>{row.source_workstation || "-"}</td>
                    <td>{row.source_ip_address || "-"}</td>
                    <td>{row.logon_type || "-"}</td>
                    <td>{row.authentication_package || "-"}</td>
                    <td>{row.domain_controller}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
          footer={
            <PaginationFooter
              page={pagination.page}
              pageSize={pagination.pageSize}
              totalRows={pagination.totalRows}
              totalPages={pagination.totalPages}
              onPageChange={pagination.setPage}
              onPageSizeChange={pagination.setPageSize}
            />
          }
        />
      </SectionPanel>
    </AppShell>
  );
}

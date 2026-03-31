"use client";

import { AppShell } from "@/components/app-shell";
import { HorizontalBars } from "@/components/charts";
import { PaginationFooter, TablePanel, usePagination } from "@/components/configuration/paginated-table";
import { SectionPanel, StatCard } from "@/components/cards";
import { ActivityQueryResult, SnapshotRun, buildActivityExportUrl } from "@/lib/api";
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

export function ReportWorkspace({
  report,
  snapshotSummary,
  snapshotRuns,
  activityQuery,
  filters,
}: {
  report: ReportDefinition;
  snapshotSummary: {
    findings?: {
      stale_users?: { count: number };
      stale_computers?: { count: number };
      password_never_expires?: { count: number };
    };
  };
  snapshotRuns: SnapshotRun[];
  activityQuery: ActivityQueryResult;
  filters: {
    actor?: string;
    domainController?: string;
    search?: string;
    startTimeUtc?: string;
    endTimeUtc?: string;
  };
}) {
  const filteredRows = activityQuery.rows;
  const pagination = usePagination(filteredRows, 10);
  const actorBars = countBy(filteredRows, (row) => formatPrincipalDisplay(row.actor)).slice(0, 8);
  const dcBars = countBy(filteredRows, (row) => row.domain_controller).slice(0, 8);
  const snapshot = snapshotSummary;
  const exportUrl = buildActivityExportUrl({
    reportKey: report.key,
    actor: filters.actor,
    domainController: filters.domainController,
    search: filters.search,
    startTimeUtc: filters.startTimeUtc,
    endTimeUtc: filters.endTimeUtc,
  });

  const supportText =
    report.capability === "activity"
      ? "Live activity-backed report"
      : report.capability === "snapshot"
        ? "Snapshot-backed report"
        : report.capability === "mixed"
          ? "Mixed activity and snapshot view"
          : "Planned collector expansion";

  return (
    <AppShell title={report.title} subtitle={report.description} eyebrow={report.category}>
      <section className="report-filter-bar panel">
        <div className="filter-pair">
          <span className="filter-label">Domain</span>
          <strong>Active Directory</strong>
        </div>
        <div className="filter-pair">
          <span className="filter-label">Coverage</span>
          <strong>{supportText}</strong>
        </div>
        <div className="filter-pair">
          <span className="filter-label">Rows in scope</span>
          <strong>{activityQuery.total_count}</strong>
        </div>
      </section>

      <section className="report-filter-bar panel">
        <div className="filter-pair">
          <span className="filter-label">Actor filter</span>
          <strong>{filters.actor || "All operators"}</strong>
        </div>
        <div className="filter-pair">
          <span className="filter-label">DC filter</span>
          <strong>{filters.domainController || "All domain controllers"}</strong>
        </div>
        <div className="filter-pair">
          <span className="filter-label">Search / Export</span>
          <div className="filter-actions">
            <strong>{filters.search || "No search filter"}</strong>
            <a className="filter-export" href={exportUrl} target="_blank" rel="noreferrer">
              Export CSV
            </a>
          </div>
        </div>
      </section>

      <section className="card-grid card-grid-four">
        <StatCard label="Activity rows" value={activityQuery.total_count} hint="Filtered for this report" />
        <StatCard label="Top operators" value={actorBars.length} hint="Unique operators in current slice" tone="accent" />
        <StatCard label="Snapshot runs" value={snapshotRuns.length} hint="Available for comparison" />
        <StatCard label="Current support" value={report.capability.toUpperCase()} hint={supportText} tone="alert" />
      </section>

      <section className="two-column">
        <SectionPanel title="Change concentration" kicker="Top operators">
          {actorBars.length ? (
            <HorizontalBars data={actorBars} />
          ) : (
            <div className="empty-state">This report needs more collected data or a broader collector scope.</div>
          )}
        </SectionPanel>
        <SectionPanel title="Domain controller distribution" kicker="Execution plane">
          {dcBars.length ? (
            <HorizontalBars tone="amber" data={dcBars} />
          ) : (
            <div className="empty-state">No domain controller distribution is available for this slice yet.</div>
          )}
        </SectionPanel>
      </section>

      <section className="two-column">
        <SectionPanel title="Current AD posture" kicker="Snapshot context">
          <div className="mini-list">
            <div className="mini-list-item">
              <span>Stale users</span>
              <strong>{snapshot.findings?.stale_users?.count ?? 0}</strong>
            </div>
            <div className="mini-list-item">
              <span>Stale computers</span>
              <strong>{snapshot.findings?.stale_computers?.count ?? 0}</strong>
            </div>
            <div className="mini-list-item">
              <span>Password never expires</span>
              <strong>{snapshot.findings?.password_never_expires?.count ?? 0}</strong>
            </div>
          </div>
        </SectionPanel>

        <SectionPanel title="Collector guidance" kicker="Next functional step">
          <div className="plain-copy">
            {report.capability === "planned"
              ? "This menu area is scaffolded and visible in the console, but it still needs a matching collector or enrichment pipeline before it can show live report-grade evidence."
              : "This menu area is already connected to live or persisted backend data. The next step is deeper filtering, export controls, and saved report presets."}
          </div>
        </SectionPanel>
      </section>

      <SectionPanel title="Detailed rows" kicker="Recent activity slice">
        {filteredRows.length ? (
          <TablePanel
            table={
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Actor</th>
                    <th>Action</th>
                    <th>Type</th>
                    <th>Target</th>
                    <th>Source</th>
                    <th>DC</th>
                  </tr>
                </thead>
                <tbody>
                  {pagination.pagedRows.map((row) => (
                    <tr key={`${row.id}-${row.event_record_id ?? row.time_utc}`}>
                      <td>{formatDisplayDateTime(row.time_utc)}</td>
                      <td>{formatPrincipalDisplay(row.actor)}</td>
                      <td>{row.action}</td>
                      <td>{row.target_type}</td>
                      <td>{row.target_name}</td>
                      <td>{row.source_workstation || row.source_ip_address || "-"}</td>
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
        ) : (
          <div className="empty-state">No rows are currently mapped to this menu item.</div>
        )}
      </SectionPanel>
    </AppShell>
  );
}

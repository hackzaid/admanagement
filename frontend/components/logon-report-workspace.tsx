"use client";

import { AppShell } from "@/components/app-shell";
import { HorizontalBars } from "@/components/charts";
import { PaginationFooter, TablePanel, usePagination } from "@/components/configuration/paginated-table";
import { SectionPanel, StatCard } from "@/components/cards";
import {
  LogonQueryResult,
  LogonSummary,
  SnapshotFindingQueryResult,
  buildLogonExportUrl,
} from "@/lib/api";
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
  staleUsers,
  staleComputers,
  nonExpiringUsers,
  logonSummary,
  queryResult,
  rdpQuery,
  filters,
}: {
  report: ReportDefinition;
  staleUsers: SnapshotFindingQueryResult;
  staleComputers: SnapshotFindingQueryResult;
  nonExpiringUsers: SnapshotFindingQueryResult;
  logonSummary: LogonSummary;
  queryResult: LogonQueryResult;
  rdpQuery: LogonQueryResult;
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
  const rdpPagination = usePagination(rdpQuery.rows, 10);
  const staleUserPagination = usePagination(staleUsers.rows, 8);
  const staleComputerPagination = usePagination(staleComputers.rows, 8);
  const nonExpiringPagination = usePagination(nonExpiringUsers.rows, 8);
  const eventCounts = logonSummary.event_counts ?? {};
  const logonCount = eventCounts.Logon ?? rows.filter((row) => row.event_type === "Logon").length;
  const logoffCount = eventCounts.Logoff ?? rows.filter((row) => row.event_type === "Logoff").length;
  const failureCount = eventCounts.LogonFailure ?? rows.filter((row) => row.event_type === "LogonFailure").length;
  const lockoutCount = eventCounts.AccountLockout ?? rows.filter((row) => row.event_type === "AccountLockout").length;
  const rdpSummary = logonSummary.rdp_summary;

  const topUsers = countBy(rows, (row) => formatPrincipalDisplay(row.actor)).slice(0, 8);
  const sourceHosts = countBy(rows, (row) => row.source_workstation || row.source_ip_address || "Unknown").slice(0, 8);
  const eventMix = countBy(rows, (row) => row.event_type).slice(0, 6);
  const failureSources = countBy(
    rows.filter((row) => row.event_type === "LogonFailure" || row.event_type === "AccountLockout"),
    (row) => row.source_workstation || row.source_ip_address || "Unknown",
  ).slice(0, 8);
  const rdpSources = countBy(
    rdpQuery.rows,
    (row) => row.source_workstation || row.source_ip_address || "Unknown",
  ).slice(0, 8);
  const rdpRecordedHosts = countBy(rdpQuery.rows, (row) => row.domain_controller || "Unknown").slice(0, 8);
  const failureIpBars = countBy(
    rows.filter((row) => row.event_type === "LogonFailure"),
    (row) => row.source_ip_address || "Unknown",
  ).slice(0, 8);
  const lockoutWorkstationBars = countBy(
    rows.filter((row) => row.event_type === "AccountLockout"),
    (row) => row.source_workstation || "Unknown",
  ).slice(0, 8);
  const failureReasonBars = countBy(
    rows.filter((row) => row.event_type === "LogonFailure"),
    (row) => row.failure_reason || row.failure_status || "Unknown",
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
      <section className="report-filter-bar panel motion-stage-block">
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

      <section className="report-filter-bar panel motion-stage-block">
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

      <section className="card-grid card-grid-four motion-stage-block">
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

      {report.key === "user-logon-reports" ? (
        <section className="card-grid card-grid-four motion-stage-block">
          <StatCard
            label="RDP / Remote interactive successes"
            value={rdpSummary?.success_count ?? 0}
            hint="Logon type 10 sessions recorded"
            tone="accent"
          />
          <StatCard
            label="RDP / Remote interactive failures"
            value={rdpSummary?.failure_count ?? 0}
            hint="Failed or locked-out remote interactive attempts"
            tone="alert"
          />
          <StatCard
            label="Stale users behind auth risk"
            value={staleUsers.total_count}
            hint="Inactive enabled accounts to investigate"
          />
          <StatCard
            label="Password-never-expires users"
            value={nonExpiringUsers.total_count}
            hint="Human accounts should not normally live here"
            tone="alert"
          />
        </section>
      ) : null}

      <section className="two-column motion-stage-block">
        <SectionPanel title="Top users" kicker={report.key === "local-logon-logoff" ? "Observed session activity" : "Observed identity activity"}>
          <HorizontalBars data={topUsers} />
        </SectionPanel>
        <SectionPanel title={report.key === "local-logon-logoff" ? "Source workstations" : "Event mix"} kicker={report.key === "local-logon-logoff" ? "Execution origin" : "Type distribution"}>
          <HorizontalBars tone="amber" data={report.key === "local-logon-logoff" ? sourceHosts : eventMix} />
        </SectionPanel>
      </section>

      {report.key === "user-logon-reports" ? (
        <>
          <section className="two-column motion-stage-block">
            <SectionPanel title="Top failure sources" kicker="Lockouts and failed sign-ins">
              <HorizontalBars tone="amber" data={failureSources.length ? failureSources : logonSummary.top_failure_sources?.map((item) => ({ label: item.source, value: item.count })) ?? []} />
            </SectionPanel>
            <SectionPanel title="RDP access origin" kicker="Remote interactive access recorded by source IP or workstation">
              <HorizontalBars
                tone="amber"
                data={
                  rdpSources.length
                    ? rdpSources
                    : rdpSummary?.top_sources?.map((item) => ({ label: item.source, value: item.count })) ?? []
                }
              />
              <div className="plain-copy" style={{ marginTop: 16 }}>
                Source IP and workstation are strongest when the recording host is the actual target server. When you only poll domain controllers, this remains authentication evidence rather than full endpoint-session evidence.
              </div>
            </SectionPanel>
          </section>

          <section className="two-column motion-stage-block">
            <SectionPanel title="Failure reasons" kicker="Why sign-ins are being rejected">
              <HorizontalBars
                tone="amber"
                data={
                  failureReasonBars.length
                    ? failureReasonBars
                    : logonSummary.top_failure_reasons?.map((item) => ({ label: item.reason, value: item.count })) ?? []
                }
              />
            </SectionPanel>
            <SectionPanel title="Failed logons by source IP" kicker="Password spray and credential misuse vantage">
              <HorizontalBars
                tone="amber"
                data={
                  failureIpBars.length
                    ? failureIpBars
                    : logonSummary.failure_ip_sources?.map((item) => ({ label: item.source, value: item.count })) ?? []
                }
              />
            </SectionPanel>
          </section>

          <section className="two-column motion-stage-block">
            <SectionPanel title="Critical auth context" kicker="What the current failure pattern is pointing to">
              <div className="mini-list">
                <div className="mini-list-item">
                  <span>Most common failure reason</span>
                  <strong>{failureReasonBars[0]?.label || logonSummary.top_failure_reasons?.[0]?.reason || "No failure detail"}</strong>
                </div>
                <div className="mini-list-item">
                  <span>Top source IP</span>
                  <strong>{failureIpBars[0]?.label || logonSummary.failure_ip_sources?.[0]?.source || "No source IP"}</strong>
                </div>
                <div className="mini-list-item">
                  <span>Top lockout caller</span>
                  <strong>{lockoutWorkstationBars[0]?.label || logonSummary.lockout_workstations?.[0]?.source || "No caller"}</strong>
                </div>
              </div>
            </SectionPanel>
            <SectionPanel title="Lockouts by source workstation" kicker="Caller machine concentration">
              <HorizontalBars
                data={
                  lockoutWorkstationBars.length
                    ? lockoutWorkstationBars
                    : logonSummary.lockout_workstations?.map((item) => ({ label: item.source, value: item.count })) ?? []
                }
              />
            </SectionPanel>
          </section>

          <section className="two-column motion-stage-block">
            <SectionPanel title="RDP recorded hosts" kicker="Which target hosts are producing remote interactive evidence">
              <HorizontalBars
                data={
                  rdpRecordedHosts.length
                    ? rdpRecordedHosts
                    : rdpSummary?.recording_hosts?.map((item) => ({ label: item.host, value: item.count })) ?? []
                }
              />
              <div className="plain-copy" style={{ marginTop: 16 }}>
                Add member servers and jump hosts under Configuration {" > "} Domain Controllers {" > "} Logon Source Hosts to move this from DC-authentication perspective to actual target-host perspective.
              </div>
            </SectionPanel>
            <SectionPanel title="What this means" kicker="Using the new pivots">
              <div className="mini-list">
                <div className="mini-list-item">
                  <span>Source IP pivot</span>
                  <strong>Find spray / brute-force origin</strong>
                </div>
                <div className="mini-list-item">
                  <span>Lockout workstation pivot</span>
                  <strong>Find noisy callers and bad mappings</strong>
                </div>
                <div className="mini-list-item">
                  <span>Recorded host pivot</span>
                  <strong>Find which server was actually accessed</strong>
                </div>
              </div>
            </SectionPanel>
          </section>

          <section className="two-column motion-stage-block">
            <SectionPanel title="Stale enabled users" kicker="Accounts that may still be generating auth noise">
              <TablePanel
                table={
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Days inactive</th>
                        <th>Last logon</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staleUserPagination.pagedRows.map((row) => (
                        <tr key={String(row.name)}>
                          <td>{formatPrincipalDisplay(String(row.name))}</td>
                          <td>{String(row.days_since_logon ?? "Unknown")}</td>
                          <td>{formatDisplayDateTime(String(row.last_logon_utc ?? ""), "No recorded logon")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                }
                footer={
                  <PaginationFooter
                    page={staleUserPagination.page}
                    pageSize={staleUserPagination.pageSize}
                    totalRows={staleUserPagination.totalRows}
                    totalPages={staleUserPagination.totalPages}
                    onPageChange={staleUserPagination.setPage}
                    onPageSizeChange={staleUserPagination.setPageSize}
                  />
                }
              />
            </SectionPanel>
            <SectionPanel title="Password policy exceptions" kicker="Accounts with non-expiring credentials">
              <TablePanel
                table={
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>UPN</th>
                        <th>DN</th>
                      </tr>
                    </thead>
                    <tbody>
                      {nonExpiringPagination.pagedRows.map((row) => (
                        <tr key={String(row.name)}>
                          <td>{formatPrincipalDisplay(String(row.name))}</td>
                          <td>{String(row.user_principal_name ?? "-")}</td>
                          <td>{String(row.distinguished_name ?? "-")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                }
                footer={
                  <PaginationFooter
                    page={nonExpiringPagination.page}
                    pageSize={nonExpiringPagination.pageSize}
                    totalRows={nonExpiringPagination.totalRows}
                    totalPages={nonExpiringPagination.totalPages}
                    onPageChange={nonExpiringPagination.setPage}
                    onPageSizeChange={nonExpiringPagination.setPageSize}
                  />
                }
              />
            </SectionPanel>
          </section>

          <div className="motion-stage-block">
          <SectionPanel title="RDP / remote interactive detail" kicker="Logon type 10 rows with source context">
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
                      <th>Recorded On</th>
                      <th>Auth</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rdpPagination.pagedRows.map((row) => (
                      <tr key={`${row.id}-${row.event_record_id ?? row.time_utc}`}>
                        <td>{formatDisplayDateTime(row.time_utc)}</td>
                        <td>{formatPrincipalDisplay(row.actor)}</td>
                        <td>{row.event_type}</td>
                        <td>{row.source_workstation || "-"}</td>
                        <td>{row.source_ip_address || "-"}</td>
                        <td>{row.domain_controller}</td>
                        <td>{row.authentication_package || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              }
              footer={
                <PaginationFooter
                  page={rdpPagination.page}
                  pageSize={rdpPagination.pageSize}
                  totalRows={rdpPagination.totalRows}
                  totalPages={rdpPagination.totalPages}
                  onPageChange={rdpPagination.setPage}
                  onPageSizeChange={rdpPagination.setPageSize}
                />
              }
            />
          </SectionPanel>
          </div>

          <div className="motion-stage-block">
          <SectionPanel title="Stale computers behind auth noise" kicker="Enabled computer accounts without recent sign-in">
            <TablePanel
              table={
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Computer</th>
                      <th>Days inactive</th>
                      <th>Last logon</th>
                      <th>DN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staleComputerPagination.pagedRows.map((row) => (
                      <tr key={String(row.name)}>
                        <td>{String(row.name)}</td>
                        <td>{String(row.days_since_logon ?? "Unknown")}</td>
                        <td>{formatDisplayDateTime(String(row.last_logon_utc ?? ""), "No recorded logon")}</td>
                        <td>{String(row.distinguished_name ?? "-")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              }
              footer={
                <PaginationFooter
                  page={staleComputerPagination.page}
                  pageSize={staleComputerPagination.pageSize}
                  totalRows={staleComputerPagination.totalRows}
                  totalPages={staleComputerPagination.totalPages}
                  onPageChange={staleComputerPagination.setPage}
                  onPageSizeChange={staleComputerPagination.setPageSize}
                />
              }
            />
          </SectionPanel>
          </div>
        </>
      ) : null}

      <div className="motion-stage-block">
      <SectionPanel title="Detailed authentication rows" kicker="Recent identity access events">
        <TablePanel
          table={
            <table className="data-table">
              <thead>
                  <tr>
                    <th>Time</th>
                    <th>User</th>
                    <th>Event</th>
                    <th>Failure reason</th>
                    <th>Status</th>
                    <th>Source Workstation</th>
                    <th>Source IP</th>
                    <th>Logon Type</th>
                  <th>Auth</th>
                  <th>Recorded On</th>
                </tr>
              </thead>
              <tbody>
                {pagination.pagedRows.map((row) => (
                  <tr key={`${row.id}-${row.event_record_id ?? row.time_utc}`}>
                    <td>{formatDisplayDateTime(row.time_utc)}</td>
                    <td>{formatPrincipalDisplay(row.actor)}</td>
                    <td>{row.event_type}</td>
                    <td>{row.failure_reason || "-"}</td>
                    <td>{row.failure_status || row.failure_sub_status || "-"}</td>
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
      </div>
    </AppShell>
  );
}

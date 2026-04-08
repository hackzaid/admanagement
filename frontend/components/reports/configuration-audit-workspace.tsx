"use client";

import { AppShell } from "@/components/app-shell";
import { PaginationFooter, TablePanel, usePagination } from "@/components/configuration/paginated-table";
import { SectionPanel, StatCard } from "@/components/cards";
import {
  SnapshotDrift,
  SnapshotFindingQueryResult,
  SnapshotRun,
  SnapshotSummary,
} from "@/lib/api";
import { formatDisplayDateTime } from "@/lib/datetime";
import { formatPrincipalDisplay } from "@/lib/identity";
import { ReportDefinition } from "@/lib/navigation";

export function ConfigurationAuditWorkspace({
  report,
  summary,
  runs,
  staleUsers,
  staleComputers,
  nonExpiringUsers,
  privilegedMembers,
  drift,
}: {
  report: ReportDefinition;
  summary: SnapshotSummary;
  runs: SnapshotRun[];
  staleUsers: SnapshotFindingQueryResult;
  staleComputers: SnapshotFindingQueryResult;
  nonExpiringUsers: SnapshotFindingQueryResult;
  privilegedMembers: SnapshotFindingQueryResult;
  drift: SnapshotDrift | null;
}) {
  const runPagination = usePagination(runs, 6);
  const staleUserPagination = usePagination(staleUsers.rows, 8);
  const staleComputerPagination = usePagination(staleComputers.rows, 8);
  const nonExpiringPagination = usePagination(nonExpiringUsers.rows, 8);
  const privilegedMemberPagination = usePagination(privilegedMembers.rows, 8);
  const driftObjectRows = Object.entries(drift?.object_count_delta ?? {}).map(([objectType, values]) => ({
    objectType,
    ...values,
  }));
  const driftObjectPagination = usePagination(driftObjectRows, 8);
  const privilegedDriftRows = Object.entries(drift?.privileged_membership_changes ?? {}).map(([groupName, values]) => ({
    groupName,
    ...values,
  }));
  const privilegedDriftPagination = usePagination(privilegedDriftRows, 8);
  const enabledToDisabled = drift?.status_changes.enabled_to_disabled ?? [];
  const disabledToEnabled = drift?.status_changes.disabled_to_enabled ?? [];

  const latestRun = runs[0];
  const previousRun = runs[1];

  return (
    <AppShell title={report.title} subtitle={report.description} eyebrow={report.category} heroMode="none">
      <section className="report-stage motion-stage-block">
        <div className="report-stage-copy">
          <span className="report-stage-kicker">{report.category}</span>
          <h2>{report.title}</h2>
          <p>
            Track the current directory posture and the last run-to-run drift so stale identities, risky password settings,
            and privileged exposure can be investigated with actual object evidence.
          </p>
        </div>
        <div className="report-stage-side">
          <div className="report-stage-metric">
            <span>Latest snapshot</span>
            <strong>{formatDisplayDateTime(summary.captured_at_utc, "No snapshot captured")}</strong>
          </div>
          <div className="report-stage-metric">
            <span>Drift window</span>
            <strong>{previousRun ? `${previousRun.run_id} → ${latestRun?.run_id ?? "latest"}` : "Single run only"}</strong>
          </div>
        </div>
      </section>

      <section className="card-grid card-grid-four motion-stage-block">
        <StatCard
          label="Stale users"
          value={summary.findings?.stale_users?.count ?? 0}
          hint="Enabled accounts with no recent sign-in"
          tone="alert"
        />
        <StatCard
          label="Stale computers"
          value={summary.findings?.stale_computers?.count ?? 0}
          hint="Enabled devices lacking recent logon evidence"
          tone="alert"
        />
        <StatCard
          label="Password never expires"
          value={summary.findings?.password_never_expires?.count ?? 0}
          hint="Human accounts should be reviewed"
          tone="accent"
        />
        <StatCard
          label="Privileged memberships"
          value={privilegedMembers.total_count}
          hint="Flattened members across watched groups"
        />
      </section>

      <section className="two-column motion-stage-block">
        <SectionPanel title="Run-to-run drift" kicker="Directory object movement">
          {driftObjectRows.length ? (
            <TablePanel
              table={
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Object type</th>
                      <th>Previous</th>
                      <th>Current</th>
                      <th>Delta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {driftObjectPagination.pagedRows.map((row) => (
                      <tr key={row.objectType}>
                        <td>{row.objectType}</td>
                        <td>{row.baseline_count}</td>
                        <td>{row.target_count}</td>
                        <td>{row.delta}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              }
              footer={
                <PaginationFooter
                  page={driftObjectPagination.page}
                  pageSize={driftObjectPagination.pageSize}
                  totalRows={driftObjectPagination.totalRows}
                  totalPages={driftObjectPagination.totalPages}
                  onPageChange={driftObjectPagination.setPage}
                  onPageSizeChange={driftObjectPagination.setPageSize}
                />
              }
            />
          ) : (
            <div className="empty-state">A second snapshot run is needed before drift can be compared here.</div>
          )}
        </SectionPanel>

        <SectionPanel title="Status transitions" kicker="Enabled and disabled changes between runs">
          <div className="mini-list">
            <div className="mini-list-item">
              <span>Enabled to disabled</span>
              <strong>{enabledToDisabled.length}</strong>
            </div>
            <div className="mini-list-item">
              <span>Disabled to enabled</span>
              <strong>{disabledToEnabled.length}</strong>
            </div>
            <div className="mini-list-item">
              <span>Latest run</span>
              <strong>{summary.run_id ?? "No run"}</strong>
            </div>
          </div>
          <div className="plain-copy">
            {drift
              ? "Use these deltas to explain whether risk changed because the directory itself changed or because the latest snapshot simply exposed existing debt."
              : "Once a second snapshot is available, this section will show which users and computers changed enabled state between runs."}
          </div>
        </SectionPanel>
      </section>

      <section className="two-column motion-stage-block">
        <SectionPanel title="Recent snapshot runs" kicker="Collection history">
          <TablePanel
            table={
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Run</th>
                    <th>Captured</th>
                    <th>Total objects</th>
                    <th>Users</th>
                    <th>Computers</th>
                  </tr>
                </thead>
                <tbody>
                  {runPagination.pagedRows.map((run) => (
                    <tr key={run.run_id}>
                      <td>{run.run_id}</td>
                      <td>{formatDisplayDateTime(run.captured_at_utc)}</td>
                      <td>{run.total_objects}</td>
                      <td>{run.counts.user ?? 0}</td>
                      <td>{run.counts.computer ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            }
            footer={
              <PaginationFooter
                page={runPagination.page}
                pageSize={runPagination.pageSize}
                totalRows={runPagination.totalRows}
                totalPages={runPagination.totalPages}
                onPageChange={runPagination.setPage}
                onPageSizeChange={runPagination.setPageSize}
              />
            }
          />
        </SectionPanel>

        <SectionPanel title="Privileged membership drift" kicker="Group-level changes between runs">
          {privilegedDriftRows.length ? (
            <TablePanel
              table={
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Group</th>
                      <th>Added</th>
                      <th>Removed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {privilegedDriftPagination.pagedRows.map((row) => (
                      <tr key={row.groupName}>
                        <td>{row.groupName}</td>
                        <td>{row.added_members.length}</td>
                        <td>{row.removed_members.length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              }
              footer={
                <PaginationFooter
                  page={privilegedDriftPagination.page}
                  pageSize={privilegedDriftPagination.pageSize}
                  totalRows={privilegedDriftPagination.totalRows}
                  totalPages={privilegedDriftPagination.totalPages}
                  onPageChange={privilegedDriftPagination.setPage}
                  onPageSizeChange={privilegedDriftPagination.setPageSize}
                />
              }
            />
          ) : (
            <div className="empty-state">No privileged group membership changes were detected between the latest runs.</div>
          )}
        </SectionPanel>
      </section>

      <section className="two-column motion-stage-block">
        <SectionPanel title="Stale users" kicker="Immediate investigation list">
          <TablePanel
            table={
              <table className="data-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Days inactive</th>
                    <th>Last logon</th>
                    <th>DN</th>
                  </tr>
                </thead>
                <tbody>
                  {staleUserPagination.pagedRows.map((row) => (
                    <tr key={String(row.name)}>
                      <td>{formatPrincipalDisplay(String(row.name))}</td>
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

        <SectionPanel title="Password exceptions" kicker="Human accounts with non-expiring passwords">
          <TablePanel
            table={
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Account</th>
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

      <section className="two-column motion-stage-block">
        <SectionPanel title="Stale computers" kicker="Devices needing review or quarantine">
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

        <SectionPanel title="Privileged members" kicker="Flattened membership evidence">
          <TablePanel
            table={
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Group</th>
                    <th>Member</th>
                    <th>Member DN</th>
                  </tr>
                </thead>
                <tbody>
                  {privilegedMemberPagination.pagedRows.map((row, index) => (
                    <tr key={`${String(row.group_name)}-${String(row.member_dn)}-${index}`}>
                      <td>{String(row.group_name ?? "-")}</td>
                      <td>{formatPrincipalDisplay(String(row.member_name ?? "-"))}</td>
                      <td>{String(row.member_dn ?? "-")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            }
            footer={
              <PaginationFooter
                page={privilegedMemberPagination.page}
                pageSize={privilegedMemberPagination.pageSize}
                totalRows={privilegedMemberPagination.totalRows}
                totalPages={privilegedMemberPagination.totalPages}
                onPageChange={privilegedMemberPagination.setPage}
                onPageSizeChange={privilegedMemberPagination.setPageSize}
              />
            }
          />
        </SectionPanel>
      </section>
    </AppShell>
  );
}

"use client";

import { PaginationFooter, TablePanel, usePagination } from "@/components/configuration/paginated-table";
import { SectionPanel, StatCard } from "@/components/cards";
import { SnapshotFindingQueryResult, SnapshotRun, SnapshotSummary } from "@/lib/api";
import { formatDisplayDateTime } from "@/lib/datetime";
import { formatPrincipalDisplay } from "@/lib/identity";

export function SnapshotsWorkspace({
  summary,
  runs,
  staleUsers,
  staleComputers,
  nonExpiringUsers,
  privilegedMembers,
}: {
  summary: SnapshotSummary;
  runs: SnapshotRun[];
  staleUsers: SnapshotFindingQueryResult;
  staleComputers: SnapshotFindingQueryResult;
  nonExpiringUsers: SnapshotFindingQueryResult;
  privilegedMembers: SnapshotFindingQueryResult;
}) {
  const privileged = summary.findings?.privileged_groups ?? {};
  const privilegedRows = Object.entries(privileged).map(([name, details]) => ({
    name,
    details,
  }));
  const privilegedPagination = usePagination(privilegedRows, 5);
  const runsPagination = usePagination(runs, 10);
  const staleUserPagination = usePagination(staleUsers.rows, 10);
  const staleComputerPagination = usePagination(staleComputers.rows, 10);
  const nonExpiringPagination = usePagination(nonExpiringUsers.rows, 10);
  const privilegedMemberPagination = usePagination(privilegedMembers.rows, 10);

  return (
    <>
      <section className="card-grid card-grid-four">
        <StatCard
          label="Latest run id"
          value={summary.run_id ?? "No run"}
          hint={formatDisplayDateTime(summary.captured_at_utc, "No timestamp")}
        />
        <StatCard label="Stale users" value={summary.findings?.stale_users?.count ?? 0} hint="Enabled but inactive" tone="alert" />
        <StatCard label="Stale computers" value={summary.findings?.stale_computers?.count ?? 0} hint="Enabled but inactive" tone="alert" />
        <StatCard
          label="Password never expires"
          value={summary.findings?.password_never_expires?.count ?? 0}
          hint="Human accounts should be reviewed"
          tone="accent"
        />
      </section>

      <section className="two-column">
        <SectionPanel title="Privileged group exposure" kicker="Tier 0 oversight">
          <TablePanel
            table={
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Group</th>
                    <th>Sample members</th>
                    <th>Members</th>
                  </tr>
                </thead>
                <tbody>
                  {privilegedPagination.pagedRows.map((row) => (
                    <tr key={row.name}>
                      <td>{row.name}</td>
                      <td>
                        {row.details.sample_members?.slice(0, 4).map((member) => formatPrincipalDisplay(member)).join(", ") || "No sample members"}
                      </td>
                      <td>{row.details.member_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            }
            footer={
              <PaginationFooter
                page={privilegedPagination.page}
                pageSize={privilegedPagination.pageSize}
                totalRows={privilegedPagination.totalRows}
                totalPages={privilegedPagination.totalPages}
                onPageChange={privilegedPagination.setPage}
                onPageSizeChange={privilegedPagination.setPageSize}
              />
            }
          />
        </SectionPanel>

        <SectionPanel title="Recent snapshot runs" kicker="Collection history">
          <TablePanel
            table={
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Run</th>
                    <th>Captured</th>
                    <th>Total Objects</th>
                    <th>Users</th>
                    <th>Computers</th>
                  </tr>
                </thead>
                <tbody>
                  {runsPagination.pagedRows.map((run) => (
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
                page={runsPagination.page}
                pageSize={runsPagination.pageSize}
                totalRows={runsPagination.totalRows}
                totalPages={runsPagination.totalPages}
                onPageChange={runsPagination.setPage}
                onPageSizeChange={runsPagination.setPageSize}
              />
            }
          />
        </SectionPanel>
      </section>

      <SectionPanel title="Risk samples" kicker="Immediate objects to investigate">
        <section className="two-column">
          <TablePanel
            table={
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Stale user</th>
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
          <TablePanel
            table={
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Non-expiring account</th>
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
        </section>
      </SectionPanel>

      <section className="two-column">
        <SectionPanel title="Stale computers" kicker="Enabled assets lacking recent logon activity">
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

        <SectionPanel title="Privileged members" kicker="Flattened membership view for drill-down">
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
    </>
  );
}

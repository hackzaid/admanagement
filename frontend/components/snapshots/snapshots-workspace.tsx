"use client";

import { PaginationFooter, TablePanel, usePagination } from "@/components/configuration/paginated-table";
import { SectionPanel, StatCard } from "@/components/cards";
import { SnapshotRun, SnapshotSummary } from "@/lib/api";
import { formatDisplayDateTime } from "@/lib/datetime";
import { formatPrincipalDisplay } from "@/lib/identity";

export function SnapshotsWorkspace({
  summary,
  runs,
}: {
  summary: SnapshotSummary;
  runs: SnapshotRun[];
}) {
  const privileged = summary.findings?.privileged_groups ?? {};
  const privilegedRows = Object.entries(privileged).map(([name, details]) => ({
    name,
    details,
  }));
  const privilegedPagination = usePagination(privilegedRows, 5);
  const runsPagination = usePagination(runs, 10);

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
          <div className="subpanel">
            <h3>Stale users</h3>
            <ul className="plain-list">
              {(summary.findings?.stale_users?.sample ?? []).slice(0, 8).map((row) => (
                <li key={String(row.name)}>{formatPrincipalDisplay(String(row.name))}</li>
              ))}
            </ul>
          </div>
          <div className="subpanel">
            <h3>Password never expires</h3>
            <ul className="plain-list">
              {(summary.findings?.password_never_expires?.sample ?? []).slice(0, 8).map((row) => (
                <li key={String(row.name)}>{formatPrincipalDisplay(String(row.name))}</li>
              ))}
            </ul>
          </div>
        </section>
      </SectionPanel>
    </>
  );
}

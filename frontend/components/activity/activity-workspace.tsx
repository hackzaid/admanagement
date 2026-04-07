"use client";

import { PaginationFooter, TablePanel, usePagination } from "@/components/configuration/paginated-table";
import { HorizontalBars } from "@/components/charts";
import { SectionPanel, StatCard } from "@/components/cards";
import { DashboardOverview, MetricSummary } from "@/lib/api";
import { formatDisplayDateTime } from "@/lib/datetime";
import { formatPrincipalDisplay } from "@/lib/identity";

export function ActivityWorkspace({
  summary,
  recent,
}: {
  summary: MetricSummary;
  recent: DashboardOverview["recent_activity"];
}) {
  const pagination = usePagination(recent, 10);
  const topActor = summary.top_actors?.[0];
  const topAction = summary.action_counts?.[0];

  return (
    <>
      <section className="report-stage">
        <div className="report-stage-copy">
          <span className="report-stage-kicker">Operational change trail</span>
          <h2>Administrative actions can be traced by operator, object type, source workstation, and recording controller.</h2>
          <p>
            Use this slate to understand who is driving directory churn, where actions originate from, and which categories
            are dominating the current audit window.
          </p>
        </div>
        <div className="report-stage-side">
          <div className="report-stage-metric">
            <span>Primary operator</span>
            <strong>{topActor ? formatPrincipalDisplay(topActor.actor) : "No data"}</strong>
          </div>
          <div className="report-stage-metric">
            <span>Dominant action</span>
            <strong>{topAction ? `${topAction.target_type} ${topAction.action}` : "No data"}</strong>
          </div>
        </div>
      </section>

      <section className="card-grid card-grid-three">
        <StatCard label="Total activity rows" value={summary.total_count ?? 0} hint="Stored in the platform database" />
        <StatCard
          label="Latest action time"
          value={formatDisplayDateTime(summary.latest_activity_time_utc, "No data")}
          hint="Most recent stored action"
          tone="accent"
        />
        <StatCard label="Delete actions surfaced" value={summary.recent_deletes?.length ?? 0} hint="Recent delete sample size" tone="alert" />
      </section>

      <section className="two-column">
        <SectionPanel title="Most active operators" kicker="Identity concentration">
          <HorizontalBars
            data={(summary.top_actors ?? []).map((item) => ({
              label: formatPrincipalDisplay(item.actor),
              value: item.count,
            }))}
          />
        </SectionPanel>

        <SectionPanel title="Action mix" kicker="Object activity">
          <HorizontalBars
            tone="amber"
            data={(summary.action_counts ?? []).map((item) => ({
              label: `${item.target_type} ${item.action}`,
              value: item.count,
            }))}
          />
        </SectionPanel>
      </section>

      <SectionPanel title="Recent events" kicker="Latest captured rows">
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
                  <th>Workstation</th>
                  <th>IP</th>
                  <th>DC</th>
                </tr>
              </thead>
              <tbody>
                {pagination.pagedRows.map((row) => (
                  <tr key={`${row.time_utc}-${row.actor}-${row.target_name}`}>
                    <td>{formatDisplayDateTime(row.time_utc)}</td>
                    <td>{formatPrincipalDisplay(row.actor)}</td>
                    <td>{row.action}</td>
                    <td>{row.target_type}</td>
                    <td>{row.target_name}</td>
                    <td>{row.source_workstation || "-"}</td>
                    <td>{row.source_ip_address || "-"}</td>
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
    </>
  );
}

"use client";

import { useState } from "react";

import { SectionPanel, StatCard } from "@/components/cards";
import { PaginationFooter, TablePanel, usePagination } from "@/components/configuration/paginated-table";
import { SchedulerStatus, SystemOverview, applySystemUpdate, getSystemOverview } from "@/lib/api";
import { formatDisplayDateTime } from "@/lib/datetime";

function formatJobHeadline(job: SchedulerStatus["jobs"][number]) {
  const result = (job.last_result ?? {}) as Record<string, unknown>;
  if (typeof result.error === "string" && result.error) {
    return "Error";
  }
  if (job.id === "update_check") {
    if (result.update_available === true) {
      return `Update available${typeof result.latest_version === "string" ? ` | v${result.latest_version}` : ""}`;
    }
    if (result.status === "ok") {
      return "Up to date";
    }
  }
  if (typeof result.imported_rows === "number") {
    return `${result.imported_rows} imported`;
  }
  if (typeof result.persisted_rows === "number") {
    return `${result.persisted_rows} persisted`;
  }
  if (typeof result.fetched_rows === "number") {
    return `${result.fetched_rows} fetched`;
  }
  if (typeof result.status === "string") {
    return result.status;
  }
  return "Waiting for first run";
}

function formatJobDetail(job: SchedulerStatus["jobs"][number]) {
  const result = (job.last_result ?? {}) as Record<string, unknown>;
  if (typeof result.error === "string" && result.error) {
    return result.error;
  }
  if (typeof result.timestamp_utc === "string") {
    return `Last result ${formatDisplayDateTime(result.timestamp_utc)}`;
  }
  if (typeof result.checked_at_utc === "string") {
    return `Checked ${formatDisplayDateTime(result.checked_at_utc)}`;
  }
  if (typeof result.captured_at_utc === "string") {
    return `Captured ${formatDisplayDateTime(result.captured_at_utc)}`;
  }
  return "No result metadata yet";
}

function DetailRows({
  rows,
  initialPageSize = 5,
}: {
  rows: Array<[string, string]>;
  initialPageSize?: number;
}) {
  const pagination = usePagination(rows, initialPageSize);

  return (
    <TablePanel
      table={
        <div className="summary-table-wrap">
          <table className="summary-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {pagination.pagedRows.map(([label, value]) => (
                <tr key={label}>
                  <td className="summary-cell-title">{label}</td>
                  <td>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
  );
}

export function SystemWorkspace({ initialOverview }: { initialOverview: SystemOverview }) {
  const [overview, setOverview] = useState(initialOverview);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);

  const jobsPagination = usePagination(overview.scheduler.jobs, 5);

  const refreshOverview = async () => {
    setLoading(true);
    try {
      const nextOverview = await getSystemOverview(true);
      setOverview(nextOverview);
    } finally {
      setLoading(false);
    }
  };

  const applyUpdate = async () => {
    setApplying(true);
    try {
      await applySystemUpdate();
      const nextOverview = await getSystemOverview(true);
      setOverview(nextOverview);
    } finally {
      setApplying(false);
    }
  };

  const updateStatus = overview.update_status;
  const releaseRows: Array<[string, string]> = [
    ["Current version", `v${overview.health.version}`],
    ["Current build ref", updateStatus.current_ref?.slice(0, 12) || "Unknown"],
    ["Latest version", updateStatus.latest_version ? `v${updateStatus.latest_version}` : "No release metadata"],
    ["Latest branch ref", updateStatus.latest_ref?.slice(0, 12) || "Unknown"],
    ["Last checked", formatDisplayDateTime(updateStatus.checked_at_utc, "Not checked yet")],
    ["Release published", formatDisplayDateTime(updateStatus.latest_published_at_utc, "No publish date")],
    ["Repository", overview.deployment.repository || "Not configured"],
    ["Update channel", overview.deployment.channel || "Not configured"],
    ["Tracking branch", overview.deployment.branch || "Not configured"],
    ["Deploy mode", overview.deployment.deploy_mode || "Not configured"],
  ];

  const runtimeRows: Array<[string, string]> = [
    ["Application", overview.health.app],
    ["Environment", overview.health.environment],
    ["Scheduler enabled", overview.deployment.scheduler_enabled ? "Yes" : "No"],
    ["Scheduler running", overview.scheduler.running ? "Yes" : "No"],
    ["Configured jobs", `${overview.scheduler.jobs.length}`],
    ["Update status", updateStatus.update_available ? "Update available" : updateStatus.status === "ok" ? "Current" : updateStatus.status],
    ["Apply updates", overview.update_apply.enabled ? "Enabled" : "Disabled"],
    ["Apply state", overview.update_apply.state],
  ];

  return (
    <>
      <section className="card-grid card-grid-four">
        <StatCard label="Current version" value={`v${overview.health.version}`} hint={overview.health.environment} />
        <StatCard
          label="Latest release"
          value={updateStatus.latest_version ? `v${updateStatus.latest_version}` : "Unknown"}
          hint={updateStatus.update_available ? "Update available" : "No newer release detected"}
          tone={updateStatus.update_available ? "alert" : "accent"}
        />
        <StatCard
          label="Last checked"
          value={formatDisplayDateTime(updateStatus.checked_at_utc, "Not checked")}
          hint={overview.deployment.repository || "No repository configured"}
        />
        <StatCard
          label="Scheduler"
          value={overview.scheduler.running ? "Running" : "Stopped"}
          hint={`${overview.scheduler.jobs.length} jobs registered`}
          tone={overview.scheduler.running ? "accent" : "default"}
        />
      </section>

      <section className="two-column">
        <SectionPanel
          title="Release monitoring"
          kicker="Version control"
          actions={
            <div className="section-actions">
              <button className="hero-pill" disabled={!overview.update_apply.enabled || applying} onClick={() => void applyUpdate()} type="button">
                {applying ? "Starting update..." : "Apply update"}
              </button>
              <button className="hero-pill hero-pill-outline" onClick={() => void refreshOverview()} type="button">
                {loading ? "Refreshing..." : "Refresh status"}
              </button>
            </div>
          }
        >
          <div className="system-callout">
            <div>
              <strong>
                {updateStatus.update_available
                  ? `Version ${updateStatus.latest_version} is ready to deploy`
                  : "The running build matches the latest known release"}
              </strong>
              <p>
                {updateStatus.error
                  ? updateStatus.error
                  : updateStatus.release_notes_excerpt || "Use this page to confirm release readiness before updating the deployment."}
              </p>
            </div>
            {updateStatus.latest_release_url ? (
              <a className="hero-pill" href={updateStatus.latest_release_url} rel="noreferrer" target="_blank">
                View release
              </a>
            ) : null}
          </div>
          {updateStatus.upgrade_instructions?.length ? (
            <code className="update-banner-command">{updateStatus.upgrade_instructions.join(" && ")}</code>
          ) : null}
          {overview.update_apply.last_error ? <div className="banner banner-danger">{overview.update_apply.last_error}</div> : null}
          <DetailRows rows={releaseRows} />
        </SectionPanel>

        <SectionPanel title="Runtime profile" kicker="Deployment posture">
          <DetailRows rows={runtimeRows} />
        </SectionPanel>
      </section>

      <SectionPanel title="Scheduler jobs" kicker="Collector operations">
        <TablePanel
          table={
            <div className="summary-table-wrap">
              <table className="summary-table">
                <thead>
                  <tr>
                    <th>Job</th>
                    <th>Next run</th>
                    <th>Outcome</th>
                    <th>Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {jobsPagination.pagedRows.map((job) => (
                    <tr key={job.id}>
                      <td className="summary-cell-title">{job.id}</td>
                      <td>{formatDisplayDateTime(job.next_run_time_utc, "Not scheduled")}</td>
                      <td>{formatJobHeadline(job)}</td>
                      <td>{formatJobDetail(job)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          }
          footer={
            <PaginationFooter
              page={jobsPagination.page}
              pageSize={jobsPagination.pageSize}
              totalRows={jobsPagination.totalRows}
              totalPages={jobsPagination.totalPages}
              onPageChange={jobsPagination.setPage}
              onPageSizeChange={jobsPagination.setPageSize}
            />
          }
        />
      </SectionPanel>
    </>
  );
}

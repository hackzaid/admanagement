"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useMemo, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { DonutSummary, LinePulseChart, VerticalBars } from "@/components/charts";
import { PaginationFooter, TablePanel, usePagination } from "@/components/configuration/paginated-table";
import {
  DashboardOverview,
  DashboardRunNowResult,
  SavedDashboardView,
  SavedReport,
  deleteSavedDashboardView,
  getDashboardOverviewFiltered,
  saveDashboardView,
  triggerDashboardRunNow,
} from "@/lib/api";
import {
  DashboardFilterState,
  DashboardPreset,
  buildDashboardApiParams,
  buildDashboardQueryString,
} from "@/lib/dashboard-filters";
import { formatDisplayDateTime } from "@/lib/datetime";
import { formatPrincipalDisplay } from "@/lib/identity";

function formatCount(value: number | undefined) {
  return new Intl.NumberFormat("en-US").format(value ?? 0);
}

function deriveHourlySeries(times: string[]) {
  const hours = Array.from({ length: 24 }, () => 0);
  for (const time of times) {
    const date = new Date(time);
    if (!Number.isNaN(date.getTime())) {
      hours[date.getUTCHours()] += 1;
    }
  }
  return hours;
}

function buildUserActionMap(actionCounts: NonNullable<DashboardOverview["activity_summary"]["action_counts"]>) {
  const counts = new Map<string, number>();
  for (const item of actionCounts ?? []) {
    counts.set(`${item.target_type}:${item.action}`, item.count);
  }
  return counts;
}

function SummaryTable({
  columns,
  rows,
  initialPageSize = 5,
}: {
  columns?: string[];
  rows: Array<ReactNode[]>;
  initialPageSize?: number;
}) {
  const pagination = usePagination(rows, initialPageSize);

  return (
    <>
      <TablePanel
        table={
          <div className="summary-table-wrap">
            <table className="summary-table">
              {columns?.length ? (
                <thead>
                  <tr>
                    {columns.map((column) => (
                      <th key={column}>{column}</th>
                    ))}
                  </tr>
                </thead>
              ) : null}
              <tbody>
                {pagination.pagedRows.map((row, index) => (
                  <tr key={`${pagination.page}-${index}`}>
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex}>{cell}</td>
                    ))}
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
    </>
  );
}

export function HomeDashboard({
  overview,
  savedReports,
  initialFilters,
  initialSavedViews,
}: {
  overview: DashboardOverview;
  savedReports: SavedReport[];
  initialFilters: DashboardFilterState;
  initialSavedViews: SavedDashboardView[];
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [view, setView] = useState<"graphical" | "summary">(initialFilters.view);
  const [dashboard, setDashboard] = useState(overview);
  const [selectedPreset, setSelectedPreset] = useState<DashboardPreset>(initialFilters.preset);
  const [startDate, setStartDate] = useState(initialFilters.startDate);
  const [endDate, setEndDate] = useState(initialFilters.endDate);
  const [loading, setLoading] = useState(false);
  const [savedViewName, setSavedViewName] = useState("");
  const [storedViews, setStoredViews] = useState<SavedDashboardView[]>(initialSavedViews);
  const [runNowMessage, setRunNowMessage] = useState<string | null>(null);
  const [runNowError, setRunNowError] = useState<string | null>(null);

  const syncUrl = (nextState: DashboardFilterState) => {
    const query = buildDashboardQueryString(nextState);
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const refreshDashboard = async (nextState: DashboardFilterState) => {
    const result = await getDashboardOverviewFiltered(buildDashboardApiParams(nextState));
    setDashboard(result);
    return result;
  };

  const applyState = async (nextState: DashboardFilterState) => {
    setView(nextState.view);
    setSelectedPreset(nextState.preset);
    setStartDate(nextState.startDate);
    setEndDate(nextState.endDate);
    syncUrl(nextState);
    setRunNowMessage(null);
    setRunNowError(null);
    setLoading(true);
    try {
      await refreshDashboard(nextState);
    } finally {
      setLoading(false);
    }
  };

  const currentState: DashboardFilterState = useMemo(
    () => ({
      view,
      preset: selectedPreset,
      startDate,
      endDate,
    }),
    [view, selectedPreset, startDate, endDate],
  );

  const setViewMode = (nextView: "graphical" | "summary") => {
    setView(nextView);
    syncUrl({ ...currentState, view: nextView });
  };

  const applyPreset = async (preset: DashboardPreset) => {
    await applyState({
      ...currentState,
      preset,
    });
  };

  const applyCustomRange = async () => {
    await applyState({
      ...currentState,
      preset: "custom",
      startDate,
      endDate,
    });
  };

  const saveCurrentView = async () => {
    const name = savedViewName.trim();
    if (!name) {
      return;
    }
    setLoading(true);
    try {
      const saved = await saveDashboardView({
        name,
        state: currentState,
      });
      setStoredViews((current) =>
        [saved, ...current.filter((item) => item.id !== saved.id && item.name.toLowerCase() !== saved.name.toLowerCase())].slice(0, 12),
      );
    } finally {
      setLoading(false);
    }
    setSavedViewName("");
  };

  const applyStoredView = async (savedView: SavedDashboardView) => {
    await applyState({
      view: savedView.state.view === "summary" ? "summary" : "graphical",
      preset: savedView.state.preset ?? "7d",
      startDate: savedView.state.startDate ?? startDate,
      endDate: savedView.state.endDate ?? endDate,
    });
  };

  const removeStoredView = async (id: number) => {
    setLoading(true);
    try {
      await deleteSavedDashboardView(id);
      setStoredViews((current) => current.filter((item) => item.id !== id));
    } finally {
      setLoading(false);
    }
  };

  const visibleStoredViews = storedViews.filter((item) => (item.state.view ?? "graphical") === view);

  const snapshot = dashboard.snapshot_summary;
  const activity = dashboard.activity_summary;
  const logon = dashboard.logon_summary;
  const recent = dashboard.recent_activity;
  const actionMap = buildUserActionMap(activity.action_counts ?? []);

  const lastUpdateLabel = formatDisplayDateTime(
    activity.latest_activity_time_utc ?? logon.latest_activity_time_utc ?? snapshot.captured_at_utc,
    "No data yet",
  );

  const summarizeRunNow = (result: DashboardRunNowResult) => {
    if (result.error) {
      return result.error;
    }
    const activityRows = result.results.activity_poll?.imported_rows ?? 0;
    const logonRows = result.results.logon_poll?.imported_rows ?? 0;
    return `Pulled ${formatCount(activityRows)} AD change rows and ${formatCount(logonRows)} auth rows.`;
  };

  const handleRunNow = async () => {
    setLoading(true);
    setRunNowMessage(null);
    setRunNowError(null);
    try {
      const result = await triggerDashboardRunNow();
      if (result.error) {
        setRunNowError(result.error);
      } else {
        const errors = Object.values(result.results)
          .map((item) => item.error)
          .filter(Boolean);
        if (errors.length) {
          setRunNowError(errors.join(" | "));
        } else {
          setRunNowMessage(summarizeRunNow(result));
        }
      }
      await refreshDashboard(currentState);
    } catch (caught) {
      setRunNowError(caught instanceof Error ? caught.message : "Run now failed.");
    } finally {
      setLoading(false);
    }
  };

  const topActorBars = (activity.top_actors ?? []).slice(0, 5).map((item) => ({
    label: formatPrincipalDisplay(item.actor),
    value: item.count,
  }));

  const accountManagementBars = (activity.action_counts ?? []).slice(0, 4).map((item) => ({
    label: item.target_type,
    sublabel: item.action,
    value: item.count,
  }));

  const identityRiskSegments = [
    {
      label: "Failed logons",
      value: logon.event_counts?.LogonFailure ?? 0,
      color: "#69a8ff",
    },
    {
      label: "Lockouts",
      value: logon.event_counts?.AccountLockout ?? 0,
      color: "#f0b44d",
    },
    {
      label: "Stale users",
      value: snapshot.findings?.stale_users?.count ?? 0,
      color: "#1f5ea8",
    },
  ];

  const hourlySeries = deriveHourlySeries(recent.map((row) => row.time_utc));

  const privilegeBars = Object.entries(snapshot.findings?.privileged_groups ?? {})
    .slice(0, 7)
    .map(([label, details]) => ({
      label,
      value: details.member_count,
    }));

  const passwordBars = [
    { label: "Never Expires", value: snapshot.findings?.password_never_expires?.count ?? 0 },
    { label: "Stale Users", value: snapshot.findings?.stale_users?.count ?? 0 },
    { label: "Stale Computers", value: snapshot.findings?.stale_computers?.count ?? 0 },
  ];

  const authFailureBars = (logon.top_failure_sources ?? []).slice(0, 6).map((item) => ({
    label: item.source,
    value: item.count,
  }));

  const alerts = [
    ...((logon.top_failure_sources ?? []).slice(0, 2).map((item) => ({
      title: `${item.count} failed logons or lockouts from ${item.source}`,
      detail: "Review password spray, stale credentials, or host health",
      time: formatDisplayDateTime(logon.latest_activity_time_utc, "Latest auth activity"),
    })) ?? []),
    ...(activity.recent_deletes ?? []).slice(0, 4).map((item) => ({
      title: `${formatPrincipalDisplay(item.actor)} deleted ${item.target_name}`,
      detail: `${item.target_type} object removed on ${item.domain_controller}`,
      time: formatDisplayDateTime(item.time_utc),
    })),
    {
      title: `${formatCount(snapshot.findings?.password_never_expires?.count)} accounts have non-expiring passwords`,
      detail: "Human account review recommended",
      time: formatDisplayDateTime(snapshot.captured_at_utc, "Latest snapshot"),
    },
    {
      title: `${formatCount(snapshot.findings?.stale_computers?.count)} stale computers remain enabled`,
      detail: "Likely audit flag if not quarantined",
      time: formatDisplayDateTime(snapshot.captured_at_utc, "Latest snapshot"),
    },
  ].slice(0, 6);

  const summaryRows = [
    { label: "User Creation", value: actionMap.get("User:Create") ?? 0 },
    { label: "User Deletion", value: actionMap.get("User:Delete") ?? 0 },
    { label: "User Modification", value: actionMap.get("User:Modify") ?? 0 },
    { label: "Failed Logons", value: logon.event_counts?.LogonFailure ?? 0 },
    { label: "Locked Out Users", value: logon.event_counts?.AccountLockout ?? 0 },
    { label: "Password Never Expires", value: snapshot.findings?.password_never_expires?.count ?? 0 },
  ];

  const topFailureUsers = (logon.top_failure_users ?? []).slice(0, 6).map((item) => ({
    actor: formatPrincipalDisplay(item.actor),
    count: item.count,
  }));

  const topOperators = (activity.top_actors ?? []).slice(0, 6).map((item) => ({
    actor: formatPrincipalDisplay(item.actor),
    count: item.count,
  }));

  const privilegeRows = Object.entries(snapshot.findings?.privileged_groups ?? {})
    .slice(0, 6)
    .map(([name, details]) => ({
      name,
      count: details.member_count,
      sample: details.sample_members?.map((member) => formatPrincipalDisplay(member)).slice(0, 3).join(", ") || "-",
    }));

  const summaryBand = [
    { label: "Successful Logons", value: logon.event_counts?.Logon ?? 0, tone: "success" },
    { label: "Failed Logons", value: logon.event_counts?.LogonFailure ?? 0, tone: "failure" },
    { label: "Lockouts", value: logon.event_counts?.AccountLockout ?? 0, tone: "lockout" },
    { label: "Stale Users", value: snapshot.findings?.stale_users?.count ?? 0, tone: "neutral" },
  ];

  return (
    <AppShell
      title="Active Directory home"
      subtitle="Graphical operational view for privileged change activity, compliance pressure points, and recent alerts."
      eyebrow={dashboard.isFallback ? "Preview Mode" : "Home"}
      heroMode="none"
    >
      <section className="home-toolbar panel">
        <div className="home-toolbar-tabs">
          <button
            className={`home-tab${view === "graphical" ? " home-tab-active" : ""}`}
            onClick={() => setViewMode("graphical")}
            type="button"
          >
            Graphical View
          </button>
          <button
            className={`home-tab${view === "summary" ? " home-tab-active" : ""}`}
            onClick={() => setViewMode("summary")}
            type="button"
          >
            Summary View
          </button>
        </div>
        <div className="home-toolbar-meta">
          <span>Scope</span>
          <strong>Current Directory</strong>
        </div>
      </section>

      <section className="home-update-strip">
        <span>Last update: {lastUpdateLabel}</span>
        <button className="home-update-link" onClick={() => void handleRunNow()} type="button">
          {loading ? "Running..." : "Run now"}
        </button>
        {loading ? <span className="home-preview-flag">Refreshing</span> : null}
        {runNowMessage ? <span className="home-preview-flag">{runNowMessage}</span> : null}
        {runNowError ? <span className="home-preview-flag home-preview-flag-danger">{runNowError}</span> : null}
        {dashboard.isFallback ? <span className="home-preview-flag">Preview dataset</span> : null}
      </section>

      <section className="dashboard-filter-strip panel">
        <div className="dashboard-filter-block">
          <span className="dashboard-filter-label">Saved Views</span>
          <div className="dashboard-preset-list">
            {[
              { key: "today", label: "Today" },
              { key: "7d", label: "Last 7 Days" },
              { key: "30d", label: "Last 30 Days" },
              { key: "90d", label: "Last 90 Days" },
              { key: "all", label: "All Data" },
            ].map((preset) => (
              <button
                className={`dashboard-preset${selectedPreset === preset.key ? " dashboard-preset-active" : ""}`}
                key={preset.key}
                onClick={() => void applyPreset(preset.key as DashboardPreset)}
                type="button"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="dashboard-filter-block">
          <span className="dashboard-filter-label">Custom Date Range</span>
          <div className="dashboard-date-controls">
            <input className="dashboard-date-input" onChange={(event) => setStartDate(event.target.value)} type="date" value={startDate} />
            <input className="dashboard-date-input" onChange={(event) => setEndDate(event.target.value)} type="date" value={endDate} />
            <button className="dashboard-apply-button" onClick={() => void applyCustomRange()} type="button">
              Apply
            </button>
          </div>
        </div>

        <div className="dashboard-filter-block">
          <span className="dashboard-filter-label">Saved Filters For This View</span>
          <div className="dashboard-save-row">
            <input
              className="dashboard-date-input dashboard-save-input"
              onChange={(event) => setSavedViewName(event.target.value)}
              placeholder={`Save ${view} view`}
              type="text"
              value={savedViewName}
            />
            <button className="dashboard-apply-button" onClick={() => void saveCurrentView()} type="button">
              Save
            </button>
          </div>
          <div className="dashboard-saved-list">
            {visibleStoredViews.length ? (
              visibleStoredViews.map((item) => (
                <div className="dashboard-saved-chip" key={item.id}>
                  <button className="dashboard-saved-chip-main" onClick={() => void applyStoredView(item)} type="button">
                    {item.name}
                  </button>
                  <button className="dashboard-saved-chip-remove" onClick={() => void removeStoredView(item.id)} type="button">
                    x
                  </button>
                </div>
              ))
            ) : (
              <span className="dashboard-saved-empty">No saved filters for this slate yet.</span>
            )}
          </div>
        </div>
      </section>

      <section className="home-layout">
        <div className="home-main">
          {view === "graphical" ? (
            <section className="home-widget-grid">
              <article className="home-widget">
                <div className="home-widget-head">
                  <h3>Top operators by change volume</h3>
                  <span>Selected range</span>
                </div>
                <VerticalBars data={topActorBars} />
              </article>

              <article className="home-widget">
                <div className="home-widget-head">
                  <h3>Account management</h3>
                  <span>Selected range</span>
                </div>
                <VerticalBars data={accountManagementBars} />
              </article>

              <article className="home-widget">
                <div className="home-widget-head">
                  <h3>Identity risk mix</h3>
                  <span>Auth + snapshot weighted</span>
                </div>
                <DonutSummary segments={identityRiskSegments} />
              </article>

              <article className="home-widget">
                <div className="home-widget-head">
                  <h3>Administrative activity by hour</h3>
                  <span>UTC</span>
                </div>
                <LinePulseChart values={hourlySeries} />
              </article>

              <article className="home-widget">
                <div className="home-widget-head">
                  <h3>Privileged group exposure</h3>
                  <span>Top groups</span>
                </div>
                <VerticalBars data={privilegeBars} />
              </article>

              <article className="home-widget">
                <div className="home-widget-head">
                  <h3>Failure and stale object watch</h3>
                  <span>Immediate audit flags</span>
                </div>
                <VerticalBars data={authFailureBars.length ? authFailureBars : passwordBars} />
              </article>
            </section>
          ) : (
            <section className="summary-grid">
              <section className="summary-strip">
                <div className="summary-strip-cell">
                  <span className="summary-strip-label">View</span>
                  <strong>Executive summary</strong>
                </div>
                <div className="summary-strip-cell">
                  <span className="summary-strip-label">Scope</span>
                  <strong>Active Directory</strong>
                </div>
                <div className="summary-strip-cell">
                  <span className="summary-strip-label">Latest auth activity</span>
                  <strong>{formatDisplayDateTime(logon.latest_activity_time_utc, "No data yet")}</strong>
                </div>
                <div className="summary-strip-cell">
                  <span className="summary-strip-label">Snapshot captured</span>
                  <strong>{formatDisplayDateTime(snapshot.captured_at_utc, "No snapshot yet")}</strong>
                </div>
              </section>

              <section className="summary-band">
                {summaryBand.map((item) => (
                  <article className={`summary-band-card summary-band-card-${item.tone}`} key={item.label}>
                    <span>{item.label}</span>
                    <strong>{formatCount(item.value)}</strong>
                  </article>
                ))}
              </section>

              <article className="summary-panel">
                <div className="summary-panel-head">
                  <h3>User Logon</h3>
                  <span>Authentication summary</span>
                </div>
                <div className="summary-activity-cards">
                  <div className="summary-activity-card summary-activity-card-success">
                    <span>Success</span>
                    <strong>{formatCount(logon.event_counts?.Logon ?? 0)}</strong>
                  </div>
                  <div className="summary-activity-card summary-activity-card-failure">
                    <span>Failure</span>
                    <strong>{formatCount(logon.event_counts?.LogonFailure ?? 0)}</strong>
                  </div>
                <div className="summary-activity-card summary-activity-card-lockout">
                  <span>Lockouts</span>
                  <strong>{formatCount(logon.event_counts?.AccountLockout ?? 0)}</strong>
                </div>
              </div>
                <SummaryTable
                  columns={["Top logon failures", "Count"]}
                  rows={topFailureUsers.map((item) => [
                    <div className="summary-cell-title" key={`${item.actor}-title`}>
                      {item.actor}
                    </div>,
                    formatCount(item.count),
                  ])}
                />
              </article>

              <article className="summary-panel">
                <div className="summary-panel-head">
                  <h3>User Management</h3>
                  <span>Change and policy summary</span>
                </div>
                <SummaryTable
                  rows={summaryRows.map((item) => [
                    <div className="summary-cell-title" key={`${item.label}-title`}>
                      {item.label}
                    </div>,
                    formatCount(item.value),
                  ])}
                />
              </article>

              <article className="summary-panel">
                <div className="summary-panel-head">
                  <h3>Privilege Exposure</h3>
                  <span>High-impact groups</span>
                </div>
                <SummaryTable
                  columns={["Group", "Members"]}
                  rows={privilegeRows.map((item) => [
                    <div key={`${item.name}-title`}>
                      <div className="summary-cell-title">{item.name}</div>
                      <div className="summary-cell-subtle">{item.sample}</div>
                    </div>,
                    formatCount(item.count),
                  ])}
                />
              </article>

              <article className="summary-panel">
                <div className="summary-panel-head">
                  <h3>Change Operators</h3>
                  <span>Administrative concentration</span>
                </div>
                <SummaryTable
                  columns={["Operator", "Count"]}
                  rows={topOperators.map((item) => [
                    <div className="summary-cell-title" key={`${item.actor}-title`}>
                      {item.actor}
                    </div>,
                    formatCount(item.count),
                  ])}
                />
              </article>
            </section>
          )}
        </div>

        <aside className="home-rail">
          <section className="home-scoreboard">
            <div className="home-score-card home-score-card-danger">
              <span>Critical</span>
              <strong>{formatCount(logon.event_counts?.AccountLockout ?? 0)}</strong>
            </div>
            <div className="home-score-card home-score-card-warn">
              <span>Attention</span>
              <strong>{formatCount(logon.event_counts?.LogonFailure ?? snapshot.findings?.password_never_expires?.count)}</strong>
            </div>
          </section>

          <section className="home-rail-panel">
            <div className="home-rail-head">
              <h3>Recent alerts</h3>
              <span>View all</span>
            </div>
            <div className="alert-list">
              {alerts.map((alert) => (
                <article className="alert-item" key={`${alert.title}-${alert.time}`}>
                  <div className="alert-title">{alert.title}</div>
                  <div className="alert-detail">{alert.detail}</div>
                  <div className="alert-time">{alert.time}</div>
                </article>
              ))}
            </div>
          </section>

          <section className="home-rail-panel">
            <div className="home-rail-head">
              <h3>My reports</h3>
            </div>
            <div className="report-list">
              {savedReports.map((report) => (
                <Link className="report-list-item" href={report.href} key={report.key}>
                  {report.label}
                </Link>
              ))}
            </div>
          </section>

          <section className="home-rail-panel home-rail-panel-compact">
            <div className="mini-list-item">
              <span>Users</span>
              <strong>{formatCount(snapshot.counts?.user)}</strong>
            </div>
            <div className="mini-list-item">
              <span>Computers</span>
              <strong>{formatCount(snapshot.counts?.computer)}</strong>
            </div>
            <div className="mini-list-item">
              <span>Stored actions</span>
              <strong>{formatCount(activity.total_count)}</strong>
            </div>
            <div className="mini-list-item">
              <span>Auth events</span>
              <strong>{formatCount(logon.total_count)}</strong>
            </div>
          </section>
        </aside>
      </section>
    </AppShell>
  );
}

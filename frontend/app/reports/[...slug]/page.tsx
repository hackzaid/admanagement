import { notFound } from "next/navigation";

import { LogonReportWorkspace } from "@/components/logon-report-workspace";
import { ReportWorkspace } from "@/components/report-workspace";
import { getActivityQuery, getLogonQuery, getLogonSummary, getSnapshotRuns, getSnapshotSummary } from "@/lib/api";
import { requireAuthOrRedirect } from "@/lib/auth";
import { getReportDefinitionBySlug } from "@/lib/navigation";

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string[] }>;
  searchParams: Promise<{
    actor?: string;
    dc?: string;
    q?: string;
    start?: string;
    end?: string;
  }>;
}) {
  await requireAuthOrRedirect();
  const { slug } = await params;
  const filters = await searchParams;
  const report = getReportDefinitionBySlug(slug);

  if (!report) {
    notFound();
  }

  if (report.key === "user-logon-reports" || report.key === "local-logon-logoff") {
    const eventTypes =
      report.key === "local-logon-logoff"
        ? (["Logon", "Logoff"] as const)
        : (["Logon", "LogonFailure", "AccountLockout"] as const);

    const [snapshotSummary, logonSummary, logonQuery] = await Promise.all([
      getSnapshotSummary(),
      getLogonSummary(),
      getLogonQuery({
        actor: filters.actor,
        domainController: filters.dc,
        search: filters.q,
        startTimeUtc: filters.start,
        endTimeUtc: filters.end,
        eventTypes: Array.from(eventTypes),
        limit: 100,
      }),
    ]);

    return (
      <LogonReportWorkspace
        report={report}
        snapshotSummary={snapshotSummary}
        logonSummary={logonSummary}
        queryResult={logonQuery}
        filters={{
          actor: filters.actor,
          domainController: filters.dc,
          search: filters.q,
          startTimeUtc: filters.start,
          endTimeUtc: filters.end,
          eventTypes: Array.from(eventTypes),
        }}
      />
    );
  }

  const [snapshotSummary, snapshotRuns, activityQuery] = await Promise.all([
    getSnapshotSummary(),
    getSnapshotRuns(),
    getActivityQuery({
      reportKey: report.key,
      actor: filters.actor,
      domainController: filters.dc,
      search: filters.q,
      startTimeUtc: filters.start,
      endTimeUtc: filters.end,
      limit: 100,
    }),
  ]);

  return (
    <ReportWorkspace
      report={report}
      snapshotSummary={snapshotSummary}
      snapshotRuns={snapshotRuns}
      activityQuery={activityQuery}
      filters={{
        actor: filters.actor,
        domainController: filters.dc,
        search: filters.q,
        startTimeUtc: filters.start,
        endTimeUtc: filters.end,
      }}
    />
  );
}

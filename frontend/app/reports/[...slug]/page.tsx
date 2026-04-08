import { notFound } from "next/navigation";
import dynamic from "next/dynamic";

import {
  getActivityQuery,
  getLogonQuery,
  getLogonSummary,
  getSnapshotFindings,
  getSnapshotRuns,
  getSnapshotSummary,
} from "@/lib/api";
import { requireAuthOrRedirect } from "@/lib/auth";
import { getReportDefinitionBySlug } from "@/lib/navigation";

const LogonReportWorkspace = dynamic(() =>
  import("@/components/logon-report-workspace").then((module) => module.LogonReportWorkspace),
);
const ReportWorkspace = dynamic(() =>
  import("@/components/report-workspace").then((module) => module.ReportWorkspace),
);

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

    const [snapshotSummary, staleUsers, staleComputers, nonExpiring, logonSummary, logonQuery, rdpQuery] = await Promise.all([
      getSnapshotSummary(),
      getSnapshotFindings({ finding: "stale_users", limit: 100 }),
      getSnapshotFindings({ finding: "stale_computers", limit: 100 }),
      getSnapshotFindings({ finding: "password_never_expires", limit: 100 }),
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
      getLogonQuery({
        actor: filters.actor,
        domainController: filters.dc,
        search: filters.q,
        startTimeUtc: filters.start,
        endTimeUtc: filters.end,
        eventTypes: ["Logon", "LogonFailure", "AccountLockout"],
        logonType: "10",
        limit: 100,
      }),
    ]);

    return (
      <LogonReportWorkspace
        report={report}
        staleUsers={staleUsers}
        staleComputers={staleComputers}
        nonExpiringUsers={nonExpiring}
        logonSummary={logonSummary}
        queryResult={logonQuery}
        rdpQuery={rdpQuery}
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

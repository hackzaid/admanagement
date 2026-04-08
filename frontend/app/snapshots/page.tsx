import dynamic from "next/dynamic";

import { AppShell } from "@/components/app-shell";
import { getSnapshotFindings, getSnapshotRuns, getSnapshotSummary } from "@/lib/api";
import { requireAuthOrRedirect } from "@/lib/auth";

const SnapshotsWorkspace = dynamic(() => import("@/components/snapshots/snapshots-workspace").then((module) => module.SnapshotsWorkspace));

export default async function SnapshotsPage() {
  await requireAuthOrRedirect();
  const [summary, runs, staleUsers, staleComputers, nonExpiringUsers, privilegedMembers] = await Promise.all([
    getSnapshotSummary(),
    getSnapshotRuns(),
    getSnapshotFindings({ finding: "stale_users", limit: 250 }),
    getSnapshotFindings({ finding: "stale_computers", limit: 250 }),
    getSnapshotFindings({ finding: "password_never_expires", limit: 250 }),
    getSnapshotFindings({ finding: "privileged_group_members", limit: 250 }),
  ]);

  return (
    <AppShell
      title="Directory compliance and state drift"
      subtitle="Use snapshot evidence to track stale objects, risky password settings, and privileged group exposure over time."
      eyebrow="Compliance"
      heroMode="none"
    >
      <SnapshotsWorkspace
        runs={runs}
        summary={summary}
        staleUsers={staleUsers}
        staleComputers={staleComputers}
        nonExpiringUsers={nonExpiringUsers}
        privilegedMembers={privilegedMembers}
      />
    </AppShell>
  );
}

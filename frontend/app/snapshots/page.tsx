import { AppShell } from "@/components/app-shell";
import { SnapshotsWorkspace } from "@/components/snapshots/snapshots-workspace";
import { getSnapshotRuns, getSnapshotSummary } from "@/lib/api";
import { requireAuthOrRedirect } from "@/lib/auth";

export default async function SnapshotsPage() {
  await requireAuthOrRedirect();
  const summary = await getSnapshotSummary();
  const runs = await getSnapshotRuns();

  return (
    <AppShell
      title="Directory compliance and state drift"
      subtitle="Use snapshot evidence to track stale objects, risky password settings, and privileged group exposure over time."
      eyebrow="Compliance"
    >
      <SnapshotsWorkspace runs={runs} summary={summary} />
    </AppShell>
  );
}

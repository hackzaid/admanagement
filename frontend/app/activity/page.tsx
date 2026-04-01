import { AppShell } from "@/components/app-shell";
import { ActivityWorkspace } from "@/components/activity/activity-workspace";
import { getActivitySummary, getRecentActivity } from "@/lib/api";
import { requireAuthOrRedirect } from "@/lib/auth";

export default async function ActivityPage() {
  await requireAuthOrRedirect();
  const summary = await getActivitySummary();
  const recent = await getRecentActivity();

  return (
    <AppShell
      title="Administrative user actions"
      subtitle="Track who changed what, when it happened, and where the action originated from across the domain."
      eyebrow="AD Changes"
    >
      <ActivityWorkspace recent={recent} summary={summary} />
    </AppShell>
  );
}

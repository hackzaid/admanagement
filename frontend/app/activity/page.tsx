import dynamic from "next/dynamic";

import { AppShell } from "@/components/app-shell";
import { getActivitySummary, getRecentActivity } from "@/lib/api";
import { requireAuthOrRedirect } from "@/lib/auth";

const ActivityWorkspace = dynamic(() => import("@/components/activity/activity-workspace").then((module) => module.ActivityWorkspace));

export default async function ActivityPage() {
  await requireAuthOrRedirect();
  const summary = await getActivitySummary();
  const recent = await getRecentActivity();

  return (
    <AppShell
      title="Administrative user actions"
      subtitle="Track who changed what, when it happened, and where the action originated from across the domain."
      eyebrow="AD Changes"
      heroMode="none"
    >
      <ActivityWorkspace recent={recent} summary={summary} />
    </AppShell>
  );
}

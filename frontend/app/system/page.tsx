import { AppShell } from "@/components/app-shell";
import { SystemWorkspace } from "@/components/system/system-workspace";
import { getSystemOverview } from "@/lib/api";
import { requireAuthOrRedirect } from "@/lib/auth";

export default async function SystemPage() {
  await requireAuthOrRedirect();
  const overview = await getSystemOverview();

  return (
    <AppShell
      title="System and release management"
      subtitle="Review the running version, release availability, scheduler health, and collector job outcomes from one place."
      eyebrow="System"
    >
      <SystemWorkspace initialOverview={overview} />
    </AppShell>
  );
}

import dynamic from "next/dynamic";

import { AppShell } from "@/components/app-shell";
import { getSystemOverview } from "@/lib/api";
import { requireAuthOrRedirect } from "@/lib/auth";

const SystemWorkspace = dynamic(() => import("@/components/system/system-workspace").then((module) => module.SystemWorkspace));

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

import { DomainSettingsWorkspace } from "@/components/configuration/domain-settings-workspace";
import { getConfigurationOverview } from "@/lib/api";
import { requireAuthOrRedirect } from "@/lib/auth";

export default async function DomainSettingsPage() {
  await requireAuthOrRedirect();
  const overview = await getConfigurationOverview();
  return <DomainSettingsWorkspace overview={overview} />;
}

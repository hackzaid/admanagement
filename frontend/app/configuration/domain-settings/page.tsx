import { DomainSettingsWorkspace } from "@/components/configuration/domain-settings-workspace";
import { getConfigurationOverview } from "@/lib/api";

export default async function DomainSettingsPage() {
  const overview = await getConfigurationOverview();
  return <DomainSettingsWorkspace overview={overview} />;
}

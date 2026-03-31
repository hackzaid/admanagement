import { ConfigurationOverviewWorkspace } from "@/components/configuration/overview-workspace";
import { getConfigurationOverview } from "@/lib/api";

export default async function ConfigurationPage() {
  const overview = await getConfigurationOverview();
  return <ConfigurationOverviewWorkspace overview={overview} />;
}

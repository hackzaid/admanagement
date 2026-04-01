import { ConfigurationOverviewWorkspace } from "@/components/configuration/overview-workspace";
import { getConfigurationOverview } from "@/lib/api";
import { requireAuthOrRedirect } from "@/lib/auth";

export default async function ConfigurationPage() {
  await requireAuthOrRedirect();
  const overview = await getConfigurationOverview();
  return <ConfigurationOverviewWorkspace overview={overview} />;
}

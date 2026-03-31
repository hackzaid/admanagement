import { AlertRulesWorkspace } from "@/components/configuration/alert-rules-workspace";
import { getConfigurationOverview } from "@/lib/api";

export default async function AlertRulesPage() {
  const overview = await getConfigurationOverview();
  return <AlertRulesWorkspace overview={overview} />;
}

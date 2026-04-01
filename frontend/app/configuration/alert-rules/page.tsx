import { AlertRulesWorkspace } from "@/components/configuration/alert-rules-workspace";
import { getConfigurationOverview } from "@/lib/api";
import { requireAuthOrRedirect } from "@/lib/auth";

export default async function AlertRulesPage() {
  await requireAuthOrRedirect();
  const overview = await getConfigurationOverview();
  return <AlertRulesWorkspace overview={overview} />;
}

import { ExcludedAccountsWorkspace } from "@/components/configuration/excluded-accounts-workspace";
import { getConfigurationOverview } from "@/lib/api";

export default async function ExcludedAccountsPage() {
  const overview = await getConfigurationOverview();
  return <ExcludedAccountsWorkspace overview={overview} />;
}

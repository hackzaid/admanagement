import { ExcludedAccountsWorkspace } from "@/components/configuration/excluded-accounts-workspace";
import { getConfigurationOverview } from "@/lib/api";
import { requireAuthOrRedirect } from "@/lib/auth";

export default async function ExcludedAccountsPage() {
  await requireAuthOrRedirect();
  const overview = await getConfigurationOverview();
  return <ExcludedAccountsWorkspace overview={overview} />;
}

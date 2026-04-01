import { DomainControllersWorkspace } from "@/components/configuration/domain-controllers-workspace";
import { getConfigurationOverview } from "@/lib/api";
import { requireAuthOrRedirect } from "@/lib/auth";

export default async function DomainControllersPage() {
  await requireAuthOrRedirect();
  const overview = await getConfigurationOverview();
  return <DomainControllersWorkspace overview={overview} />;
}

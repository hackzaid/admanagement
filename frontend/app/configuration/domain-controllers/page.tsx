import { DomainControllersWorkspace } from "@/components/configuration/domain-controllers-workspace";
import { getConfigurationOverview } from "@/lib/api";

export default async function DomainControllersPage() {
  const overview = await getConfigurationOverview();
  return <DomainControllersWorkspace overview={overview} />;
}

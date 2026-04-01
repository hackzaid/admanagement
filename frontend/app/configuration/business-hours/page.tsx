import { BusinessHoursWorkspace } from "@/components/configuration/business-hours-workspace";
import { getConfigurationOverview } from "@/lib/api";
import { requireAuthOrRedirect } from "@/lib/auth";

export default async function BusinessHoursPage() {
  await requireAuthOrRedirect();
  const overview = await getConfigurationOverview();
  return <BusinessHoursWorkspace overview={overview} />;
}

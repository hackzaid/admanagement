import { BusinessHoursWorkspace } from "@/components/configuration/business-hours-workspace";
import { getConfigurationOverview } from "@/lib/api";

export default async function BusinessHoursPage() {
  const overview = await getConfigurationOverview();
  return <BusinessHoursWorkspace overview={overview} />;
}

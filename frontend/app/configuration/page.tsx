import dynamic from "next/dynamic";

import { getConfigurationOverview } from "@/lib/api";
import { requireAuthOrRedirect } from "@/lib/auth";

const ConfigurationOverviewWorkspace = dynamic(() =>
  import("@/components/configuration/overview-workspace").then((module) => module.ConfigurationOverviewWorkspace),
);

export default async function ConfigurationPage() {
  await requireAuthOrRedirect();
  const overview = await getConfigurationOverview();
  return <ConfigurationOverviewWorkspace overview={overview} />;
}

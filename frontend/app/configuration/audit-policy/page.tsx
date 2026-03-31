import { AuditPolicyWorkspace } from "@/components/configuration/audit-policy-workspace";
import { getConfigurationOverview } from "@/lib/api";

export default async function AuditPolicyPage() {
  const overview = await getConfigurationOverview();
  return <AuditPolicyWorkspace overview={overview} />;
}

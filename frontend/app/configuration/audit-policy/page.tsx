import { AuditPolicyWorkspace } from "@/components/configuration/audit-policy-workspace";
import { getConfigurationOverview } from "@/lib/api";
import { requireAuthOrRedirect } from "@/lib/auth";

export default async function AuditPolicyPage() {
  await requireAuthOrRedirect();
  const overview = await getConfigurationOverview();
  return <AuditPolicyWorkspace overview={overview} />;
}

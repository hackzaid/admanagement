import { redirect } from "next/navigation";

import { SetupWorkspace } from "@/components/onboarding/setup-workspace";
import { getSetupStatus } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const status = await getSetupStatus();

  if (!status.onboarding_required) {
    redirect("/");
  }

  return <SetupWorkspace status={status} />;
}

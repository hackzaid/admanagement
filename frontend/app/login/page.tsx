import { redirect } from "next/navigation";

import { LoginWorkspace } from "@/components/auth/login-workspace";
import { getSetupStatus } from "@/lib/api";
import { getServerSessionToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const setupStatus = await getSetupStatus();
  if (setupStatus.onboarding_required) {
    redirect("/onboarding");
  }

  const token = await getServerSessionToken();
  if (token) {
    redirect("/");
  }

  return <LoginWorkspace />;
}

import { redirect } from "next/navigation";
import dynamicImport from "next/dynamic";

import { getDashboardOverviewFiltered, getSavedDashboardViews, getSavedReports, getSetupStatus } from "@/lib/api";
import { requireAuthOrRedirect } from "@/lib/auth";
import { buildDashboardApiParams, buildFilterStateFromSearch } from "@/lib/dashboard-filters";

const HomeDashboard = dynamicImport(() => import("@/components/home-dashboard").then((module) => module.HomeDashboard));

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string;
    preset?: string;
    start?: string;
    end?: string;
  }>;
}) {
  await requireAuthOrRedirect();
  const resolvedSearchParams = await searchParams;
  const initialFilters = buildFilterStateFromSearch(resolvedSearchParams);
  const setupStatus = await getSetupStatus();
  if (setupStatus.onboarding_required) {
    redirect("/onboarding");
  }
  const [overview, savedReports, savedViews] = await Promise.all([
    getDashboardOverviewFiltered(buildDashboardApiParams(initialFilters)),
    getSavedReports(),
    getSavedDashboardViews(),
  ]);

  return <HomeDashboard initialFilters={initialFilters} initialSavedViews={savedViews} overview={overview} savedReports={savedReports} />;
}

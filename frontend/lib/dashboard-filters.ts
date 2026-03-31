export type DashboardView = "graphical" | "summary";
export type DashboardPreset = "today" | "7d" | "30d" | "90d" | "all" | "custom";

export type DashboardFilterState = {
  view: DashboardView;
  preset: DashboardPreset;
  startDate: string;
  endDate: string;
};

export function toDateInputValue(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function startOfUtcDay(value: string) {
  return `${value}T00:00:00Z`;
}

export function endOfUtcDay(value: string) {
  return `${value}T23:59:59Z`;
}

export function buildPresetRange(preset: DashboardPreset): { startTimeUtc?: string; endTimeUtc?: string } {
  const now = new Date();
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59));

  if (preset === "all" || preset === "custom") {
    return {};
  }

  if (preset === "today") {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
    return { startTimeUtc: start.toISOString(), endTimeUtc: end.toISOString() };
  }

  const days = preset === "7d" ? 7 : preset === "30d" ? 30 : 90;
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  start.setUTCHours(0, 0, 0, 0);
  return { startTimeUtc: start.toISOString(), endTimeUtc: end.toISOString() };
}

export function buildFilterStateFromSearch(search: {
  view?: string;
  preset?: string;
  start?: string;
  end?: string;
}): DashboardFilterState {
  const today = toDateInputValue(new Date());
  const view = search.view === "summary" ? "summary" : "graphical";
  const presetValues = new Set(["today", "7d", "30d", "90d", "all", "custom"]);
  const preset = presetValues.has(search.preset ?? "") ? (search.preset as DashboardPreset) : "7d";

  return {
    view,
    preset,
    startDate: search.start || today,
    endDate: search.end || today,
  };
}

export function buildDashboardQueryString(state: DashboardFilterState): string {
  const query = new URLSearchParams();
  query.set("view", state.view);
  query.set("preset", state.preset);
  if (state.preset === "custom") {
    query.set("start", state.startDate);
    query.set("end", state.endDate);
  }
  return query.toString();
}

export function buildDashboardApiParams(state: DashboardFilterState): { startTimeUtc?: string; endTimeUtc?: string } {
  if (state.preset === "custom") {
    return {
      startTimeUtc: startOfUtcDay(state.startDate),
      endTimeUtc: endOfUtcDay(state.endDate),
    };
  }

  return buildPresetRange(state.preset);
}

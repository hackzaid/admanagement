export type MetricSummary = {
  total_count?: number;
  latest_activity_time_utc?: string | null;
  top_actors?: Array<{ actor: string; count: number }>;
  action_counts?: Array<{ target_type: string; action: string; count: number }>;
  recent_deletes?: Array<{
    time_utc: string;
    actor: string;
    target_type: string;
    target_name: string;
    domain_controller: string;
  }>;
};

export type SnapshotSummary = {
  run_id?: string | null;
  captured_at_utc?: string | null;
  counts?: Record<string, number>;
  findings?: {
    stale_users?: { count: number; sample: Array<Record<string, unknown>> };
    stale_computers?: { count: number; sample: Array<Record<string, unknown>> };
    password_never_expires?: { count: number; sample: Array<Record<string, unknown>> };
    privileged_groups?: Record<string, { member_count: number; sample_members: string[] }>;
  };
};

export type SnapshotFindingRow = Record<string, unknown>;

export type SnapshotFindingQueryResult = {
  run_id?: string | null;
  finding: string;
  group_name?: string | null;
  total_count: number;
  limit: number;
  offset: number;
  rows: SnapshotFindingRow[];
};

export type SnapshotDrift = {
  baseline_run_id: string;
  target_run_id: string;
  object_count_delta: Record<string, { baseline_count: number; target_count: number; delta: number }>;
  status_changes: {
    enabled_to_disabled: Array<{ object_type: string; name: string; distinguished_name?: string | null }>;
    disabled_to_enabled: Array<{ object_type: string; name: string; distinguished_name?: string | null }>;
  };
  privileged_membership_changes: Record<string, { added_members: string[]; removed_members: string[] }>;
  target_findings?: SnapshotSummary["findings"];
};

export type SchedulerStatus = {
  enabled: boolean;
  running: boolean;
  jobs: Array<{
    id: string;
    next_run_time_utc?: string | null;
    trigger?: string;
    last_result?: unknown;
  }>;
};

export type UpdateStatus = {
  status: string;
  current_version: string;
  current_ref?: string | null;
  repository?: string | null;
  channel?: string | null;
  branch?: string | null;
  checked_at_utc?: string | null;
  latest_ref?: string | null;
  latest_version?: string | null;
  latest_release_name?: string | null;
  latest_release_url?: string | null;
  latest_published_at_utc?: string | null;
  release_notes_excerpt?: string | null;
  update_available: boolean;
  upgrade_instructions?: string[];
  error?: string | null;
};

export type SystemOverview = {
  health: {
    status: string;
    app: string;
    environment: string;
    version: string;
  };
  deployment: {
    repository?: string | null;
    channel?: string | null;
    branch?: string | null;
    deploy_mode?: string | null;
    scheduler_enabled: boolean;
  };
  scheduler: SchedulerStatus;
  update_status: UpdateStatus;
  update_apply: {
    enabled: boolean;
    state: string;
    last_requested_at_utc?: string | null;
    last_started_at_utc?: string | null;
    last_completed_at_utc?: string | null;
    last_error?: string | null;
    runner_container_id?: string | null;
    host_project_path?: string | null;
    runner_image?: string | null;
  };
};

export type DashboardRunNowResult = {
  triggered_at_utc?: string | null;
  include_snapshot: boolean;
  results: Record<string, { imported_rows?: number; fetched_rows?: number; error?: string }>;
  error?: string;
};

export type SetupStatus = {
  onboarding_required: boolean;
  onboarding_completed: boolean;
  completed_at_utc?: string | null;
  last_bootstrap_at_utc?: string | null;
  checks: {
    has_domain: boolean;
    has_ldap_credentials: boolean;
    has_winrm_credentials: boolean;
    has_domain_controllers: boolean;
  };
  prefill: {
    domain_name: string;
    domain_fqdn: string;
    ldap_server: string;
    ldap_base_dn: string;
    ldap_bind_dn: string;
    domain_controllers: string[];
    winrm_username: string;
    winrm_domain: string;
    winrm_auth: string;
    winrm_use_ssl: boolean;
    winrm_port: number;
    business_hours_timezone: string;
    business_hours_start: number;
    business_hours_end: number;
    working_days: string[];
  };
};

export type AuthSession = {
  username: string;
  display_name: string;
  distinguished_name?: string | null;
  expires_at_utc: string;
};

export type DashboardOverview = {
  snapshot_summary: SnapshotSummary;
  activity_summary: MetricSummary;
  logon_summary: LogonSummary;
  error?: string | null;
  filters?: {
    start_time_utc?: string | null;
    end_time_utc?: string | null;
  };
  recent_activity: Array<{
    time_utc: string;
    actor: string;
    action: string;
    target_type: string;
    target_name: string;
    domain_controller: string;
    source_workstation?: string | null;
    source_ip_address?: string | null;
  }>;
  scheduler?: SchedulerStatus;
};

export type SnapshotRun = {
  run_id: string;
  captured_at_utc: string;
  total_objects: number;
  counts: Record<string, number>;
};

export type ActivityRow = {
  id: number;
  time_utc: string;
  actor: string;
  action: string;
  target_type: string;
  target_name: string;
  object_class?: string | null;
  attribute_name?: string | null;
  attribute_operation?: string | null;
  attribute_value?: string | null;
  change_summary?: string | null;
  domain_controller: string;
  source_workstation?: string | null;
  source_ip_address?: string | null;
  event_id?: number;
  event_record_id?: number | null;
  distinguished_name?: string | null;
};

export type ActivityQueryResult = {
  total_count: number;
  limit: number;
  offset: number;
  rows: ActivityRow[];
};

export type ReportCatalogItem = {
  key: string;
  title: string;
  category: string;
  href: string;
  capability: string;
};

export type SavedReport = {
  key: string;
  label: string;
  href: string;
};

export type SavedDashboardView = {
  id: number;
  name: string;
  view_scope: string;
  owner_key: string;
  state: {
    view?: "graphical" | "summary";
    preset?: "today" | "7d" | "30d" | "90d" | "all" | "custom";
    startDate?: string;
    endDate?: string;
  };
  created_at_utc: string;
  updated_at_utc: string;
};

export type MustHaveModule = {
  key: string;
  title: string;
  why: string;
};

export type MonitoredDomainConfig = {
  id: number;
  name: string;
  domain_fqdn: string;
  ldap_server?: string | null;
  ldap_base_dn?: string | null;
  is_enabled: boolean;
  is_default: boolean;
  notes?: string | null;
  updated_at_utc: string;
};

export type DomainControllerConfig = {
  id: number;
  name: string;
  hostname: string;
  event_fetch_interval_seconds: number;
  status: string;
  is_enabled: boolean;
  last_activity_event_time_utc?: string | null;
  last_logon_event_time_utc?: string | null;
  updated_at_utc: string;
};

export type BusinessHoursConfig = {
  id: number;
  timezone_name: string;
  start_hour: number;
  end_hour: number;
  working_days: string[];
  updated_at_utc: string;
};

export type ExcludedAccountConfig = {
  id: number;
  principal_name: string;
  reason?: string | null;
  is_enabled: boolean;
  updated_at_utc: string;
};

export type AlertRuleConfig = {
  id: number;
  key: string;
  display_name: string;
  description?: string | null;
  severity: string;
  threshold: number;
  window_minutes: number;
  channels: string[];
  is_enabled: boolean;
  updated_at_utc: string;
};

export type AuditPolicyExpectation = {
  id: number;
  policy_key: string;
  display_name: string;
  category: string;
  required_state: string;
  rationale?: string | null;
  updated_at_utc: string;
};

export type ConfigurationOverview = {
  must_have_modules: MustHaveModule[];
  defer_modules: string[];
  domain: MonitoredDomainConfig;
  business_hours: BusinessHoursConfig;
  domain_controllers: DomainControllerConfig[];
  logon_source_hosts: string[];
  excluded_accounts: ExcludedAccountConfig[];
  alert_rules: AlertRuleConfig[];
  audit_policy_expectations: AuditPolicyExpectation[];
  error?: string | null;
};

export type LogonSummary = {
  total_count: number;
  latest_activity_time_utc?: string | null;
  top_users: Array<{ actor: string; count: number }>;
  top_failure_users?: Array<{ actor: string; count: number }>;
  event_mix: Array<{ event_type: string; count: number }>;
  event_counts?: Record<string, number>;
  top_failure_sources?: Array<{ source: string; count: number }>;
  top_failure_reasons?: Array<{ reason: string; count: number }>;
  failure_ip_sources?: Array<{ source: string; count: number }>;
  lockout_workstations?: Array<{ source: string; count: number }>;
  rdp_summary?: {
    success_count: number;
    failure_count: number;
    top_sources: Array<{ source: string; count: number }>;
    recording_hosts: Array<{ host: string; count: number }>;
  };
};

export type LogonRow = {
  id: number;
  time_utc: string;
  actor: string;
  event_type: string;
  domain_controller: string;
  target_domain_name?: string | null;
  source_workstation?: string | null;
  source_ip_address?: string | null;
  source_port?: string | null;
  logon_type?: string | null;
  authentication_package?: string | null;
  failure_status?: string | null;
  failure_sub_status?: string | null;
  failure_reason?: string | null;
  event_id?: number;
  event_record_id?: number | null;
};

export type LogonQueryResult = {
  total_count: number;
  limit: number;
  offset: number;
  rows: LogonRow[];
};

const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000";

function shouldThrowApiFallback(error: unknown) {
  return (
    typeof window === "undefined" &&
    (process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_STRICT_API_ERRORS === "true")
  )
    ? (() => {
        throw (error instanceof Error ? error : new Error("API request failed."));
      })()
    : false;
}

function getApiBaseUrl() {
  if (typeof window === "undefined") {
    return (process.env.INTERNAL_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL).replace(/\/$/, "");
  }
  return "";
}

function buildApiUrl(path: string) {
  const apiBaseUrl = getApiBaseUrl();
  return apiBaseUrl ? `${apiBaseUrl}${path}` : path;
}

function getClientSessionToken() {
  if (typeof document === "undefined") {
    return "";
  }
  const cookie = document.cookie
    .split("; ")
    .find((item) => item.startsWith("admanagement_session="));
  return cookie ? decodeURIComponent(cookie.split("=", 2)[1] ?? "") : "";
}

async function getRequestHeaders(body?: unknown) {
  const headers: Record<string, string> = {};
  if (body) {
    headers["Content-Type"] = "application/json";
  }

  if (typeof window === "undefined") {
    const { cookies } = await import("next/headers");
    const store = await cookies();
    const token = store.get("admanagement_session")?.value;
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  }

  const token = getClientSessionToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function describeNetworkError(error: unknown, apiBaseUrl: string, path: string) {
  const endpoint = apiBaseUrl
    ? `${apiBaseUrl}${path}`
    : typeof window !== "undefined"
      ? `${window.location.origin}${path}`
      : path;
  if (error instanceof DOMException && error.name === "TimeoutError") {
    return `API request timed out while contacting ${endpoint}. Check whether the backend is running and reachable from the browser.`;
  }
  if (error instanceof Error) {
    return `Could not reach the API at ${endpoint}. Check NEXT_PUBLIC_API_BASE_URL, backend port publishing, allowed frontend origins, and whether the backend is up. Browser error: ${error.message}`;
  }
  return `Could not reach the API at ${endpoint}. Check NEXT_PUBLIC_API_BASE_URL, backend connectivity, and allowed frontend origins.`;
}

async function fetchJson<T>(path: string, options?: { timeoutMs?: number }): Promise<T> {
  const apiBaseUrl = getApiBaseUrl();
  const headers = await getRequestHeaders();
  let response: Response;
  try {
    response = await fetch(buildApiUrl(path), {
      headers,
      next: { revalidate: 30 },
      signal: AbortSignal.timeout(options?.timeoutMs ?? 5000),
    });
  } catch (error) {
    throw new Error(describeNetworkError(error, apiBaseUrl, path));
  }

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

async function writeJson<T>(
  path: string,
  method: "POST" | "PUT" | "DELETE",
  body?: unknown,
  options?: { timeoutMs?: number },
): Promise<T> {
  const apiBaseUrl = getApiBaseUrl();
  const headers = await getRequestHeaders(body);
  let response: Response;
  try {
    response = await fetch(buildApiUrl(path), {
      method,
      headers: Object.keys(headers).length ? headers : undefined,
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(options?.timeoutMs ?? 10000),
    });
  } catch (error) {
    throw new Error(describeNetworkError(error, apiBaseUrl, path));
  }

  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`;
    try {
      const payload = (await response.json()) as { detail?: string };
      if (payload.detail) {
        detail = payload.detail;
      }
    } catch {}
    throw new Error(`API request failed: ${detail}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function getDashboardOverview(): Promise<DashboardOverview> {
  return getDashboardOverviewFiltered();
}

export async function triggerDashboardRunNow(includeSnapshot = false): Promise<DashboardRunNowResult> {
  return writeJson<DashboardRunNowResult>(
    `/api/dashboard/run-now${includeSnapshot ? "?include_snapshot=true" : ""}`,
    "POST",
    undefined,
    { timeoutMs: 60000 },
  );
}

export async function getUpdateStatus(refresh = false): Promise<UpdateStatus> {
  try {
    return await fetchJson<UpdateStatus>(`/api/system/update-status${refresh ? "?refresh=true" : ""}`);
  } catch (error) {
    shouldThrowApiFallback(error);
    return {
      status: "unknown",
      current_version: "",
      current_ref: null,
      update_available: false,
      error: "Update status is unavailable.",
      upgrade_instructions: [],
    };
  }
}

export async function getSystemOverview(refresh = false): Promise<SystemOverview> {
  try {
    return await fetchJson<SystemOverview>(`/api/system/overview${refresh ? "?refresh=true" : ""}`);
  } catch (error) {
    shouldThrowApiFallback(error);
    return {
      health: {
        status: "unknown",
        app: "",
        environment: "unknown",
        version: "",
      },
      deployment: {
        repository: null,
        channel: null,
        branch: null,
        deploy_mode: null,
        scheduler_enabled: false,
      },
      scheduler: {
        enabled: false,
        running: false,
        jobs: [],
      },
      update_status: {
        status: "unknown",
        current_version: "0.1.0",
        current_ref: null,
        update_available: false,
        error: "System overview is unavailable.",
      },
      update_apply: {
        enabled: false,
        state: "unavailable",
        last_error: "System overview is unavailable.",
      },
    };
  }
}

export async function applySystemUpdate() {
  return writeJson<SystemOverview["update_apply"]>("/api/system/apply-update", "POST");
}

export async function getDashboardOverviewFiltered(params?: {
  startTimeUtc?: string;
  endTimeUtc?: string;
}): Promise<DashboardOverview> {
  const query = new URLSearchParams();
  if (params?.startTimeUtc) query.set("start_time_utc", params.startTimeUtc);
  if (params?.endTimeUtc) query.set("end_time_utc", params.endTimeUtc);
  const suffix = query.size ? `?${query.toString()}` : "";

  try {
    return await fetchJson<DashboardOverview>(`/api/dashboard${suffix}`, { timeoutMs: 20000 });
  } catch (error) {
    shouldThrowApiFallback(error);
    const message = error instanceof Error ? error.message : "Dashboard data is unavailable.";
    return {
      snapshot_summary: {
        run_id: null,
        captured_at_utc: null,
        counts: {},
        findings: {},
      },
      activity_summary: {
        total_count: 0,
        latest_activity_time_utc: null,
        top_actors: [],
        action_counts: [],
        recent_deletes: [],
      },
      logon_summary: {
        total_count: 0,
        latest_activity_time_utc: null,
        top_users: [],
        top_failure_users: [],
        event_mix: [],
        event_counts: {
          Logon: 0,
          LogonFailure: 0,
          Logoff: 0,
          AccountLockout: 0,
        },
        top_failure_sources: [],
      },
      error: message,
      recent_activity: [],
      scheduler: {
        enabled: false,
        running: false,
        jobs: [],
      },
      filters: {
        start_time_utc: params?.startTimeUtc ?? null,
        end_time_utc: params?.endTimeUtc ?? null,
      },
    };
  }
}

export async function getSnapshotRuns(): Promise<SnapshotRun[]> {
  try {
    return await fetchJson<SnapshotRun[]>("/api/snapshots/runs?limit=12");
  } catch (error) {
    shouldThrowApiFallback(error);
    return [];
  }
}

export async function getSnapshotSummary(): Promise<SnapshotSummary> {
  try {
    return await fetchJson<SnapshotSummary>("/api/snapshots/summary");
  } catch (error) {
    shouldThrowApiFallback(error);
    return {
      run_id: null,
      captured_at_utc: null,
      counts: {},
      findings: {},
    };
  }
}

export async function getSnapshotFindings(params: {
  finding: "stale_users" | "stale_computers" | "password_never_expires" | "privileged_group_members";
  runId?: string;
  staleDays?: number;
  limit?: number;
  offset?: number;
  groupName?: string;
}): Promise<SnapshotFindingQueryResult> {
  const query = new URLSearchParams();
  query.set("finding", params.finding);
  if (params.runId) query.set("run_id", params.runId);
  if (params.staleDays) query.set("stale_days", String(params.staleDays));
  if (params.groupName) query.set("group_name", params.groupName);
  query.set("limit", String(params.limit ?? 100));
  query.set("offset", String(params.offset ?? 0));

  try {
    return await fetchJson<SnapshotFindingQueryResult>(`/api/snapshots/findings?${query.toString()}`);
  } catch (error) {
    shouldThrowApiFallback(error);
    return {
      run_id: params.runId ?? null,
      finding: params.finding,
      group_name: params.groupName ?? null,
      total_count: 0,
      limit: params.limit ?? 100,
      offset: params.offset ?? 0,
      rows: [],
    };
  }
}

export async function getSnapshotDrift(params: {
  baselineRunId: string;
  targetRunId?: string;
  staleDays?: number;
}): Promise<SnapshotDrift | null> {
  const query = new URLSearchParams();
  query.set("baseline_run_id", params.baselineRunId);
  if (params.targetRunId) query.set("target_run_id", params.targetRunId);
  if (params.staleDays) query.set("stale_days", String(params.staleDays));

  try {
    return await fetchJson<SnapshotDrift>(`/api/snapshots/drift?${query.toString()}`);
  } catch (error) {
    shouldThrowApiFallback(error);
    return null;
  }
}

export async function getActivitySummary(): Promise<MetricSummary> {
  try {
    return await fetchJson<MetricSummary>("/api/activity/summary?limit=12");
  } catch (error) {
    shouldThrowApiFallback(error);
    return {
      total_count: 0,
      latest_activity_time_utc: null,
      top_actors: [],
      action_counts: [],
      recent_deletes: [],
    };
  }
}

export async function getRecentActivity(): Promise<DashboardOverview["recent_activity"]> {
  try {
    return await fetchJson<DashboardOverview["recent_activity"]>("/api/activity/recent?limit=20");
  } catch (error) {
    shouldThrowApiFallback(error);
    return [];
  }
}

export async function getActivityQuery(params: {
  reportKey?: string;
  actor?: string;
  domainController?: string;
  search?: string;
  startTimeUtc?: string;
  endTimeUtc?: string;
  limit?: number;
  offset?: number;
}): Promise<ActivityQueryResult> {
  const query = new URLSearchParams();
  if (params.reportKey) query.set("report_key", params.reportKey);
  if (params.actor) query.set("actor", params.actor);
  if (params.domainController) query.set("domain_controller", params.domainController);
  if (params.search) query.set("search", params.search);
  if (params.startTimeUtc) query.set("start_time_utc", params.startTimeUtc);
  if (params.endTimeUtc) query.set("end_time_utc", params.endTimeUtc);
  query.set("limit", String(params.limit ?? 50));
  query.set("offset", String(params.offset ?? 0));

  try {
    return await fetchJson<ActivityQueryResult>(`/api/activity/query?${query.toString()}`);
  } catch (error) {
    shouldThrowApiFallback(error);
    return {
      total_count: 0,
      limit: params.limit ?? 50,
      offset: params.offset ?? 0,
      rows: [],
    };
  }
}

export function buildActivityExportUrl(params: {
  reportKey?: string;
  actor?: string;
  domainController?: string;
  search?: string;
  startTimeUtc?: string;
  endTimeUtc?: string;
  limit?: number;
}) {
  const query = new URLSearchParams();
  if (params.reportKey) query.set("report_key", params.reportKey);
  if (params.actor) query.set("actor", params.actor);
  if (params.domainController) query.set("domain_controller", params.domainController);
  if (params.search) query.set("search", params.search);
  if (params.startTimeUtc) query.set("start_time_utc", params.startTimeUtc);
  if (params.endTimeUtc) query.set("end_time_utc", params.endTimeUtc);
  query.set("limit", String(params.limit ?? 5000));
  return `${buildApiUrl("/api/activity/export.csv")}?${query.toString()}`;
}

export async function getReportCatalog(): Promise<ReportCatalogItem[]> {
  try {
    return await fetchJson<ReportCatalogItem[]>("/api/reports/catalog");
  } catch (error) {
    shouldThrowApiFallback(error);
    return [];
  }
}

export async function getSavedReports(): Promise<SavedReport[]> {
  try {
    return await fetchJson<SavedReport[]>("/api/reports/saved");
  } catch (error) {
    shouldThrowApiFallback(error);
    return [];
  }
}

export async function getSavedDashboardViews(): Promise<SavedDashboardView[]> {
  try {
    return await fetchJson<SavedDashboardView[]>("/api/reports/saved-views?view_scope=dashboard");
  } catch (error) {
    shouldThrowApiFallback(error);
    return [];
  }
}

export async function saveDashboardView(payload: {
  name: string;
  state: {
    view: "graphical" | "summary";
    preset: "today" | "7d" | "30d" | "90d" | "all" | "custom";
    startDate: string;
    endDate: string;
  };
}): Promise<SavedDashboardView> {
  return writeJson<SavedDashboardView>("/api/reports/saved-views", "POST", {
    name: payload.name,
    view_scope: "dashboard",
    state: payload.state,
  });
}

export async function deleteSavedDashboardView(itemId: number): Promise<{ ok: boolean }> {
  return writeJson<{ ok: boolean }>(`/api/reports/saved-views/${itemId}`, "DELETE");
}

export async function getConfigurationOverview(): Promise<ConfigurationOverview> {
  try {
    return await fetchJson<ConfigurationOverview>("/api/configuration/overview");
  } catch (error) {
    shouldThrowApiFallback(error);
    const message = error instanceof Error ? error.message : "Configuration data is unavailable.";
    return {
      must_have_modules: [],
      defer_modules: [],
      domain: {
        id: 0,
        name: "Unavailable",
        domain_fqdn: "",
        ldap_server: null,
        ldap_base_dn: null,
        is_enabled: false,
        is_default: false,
        notes: null,
        updated_at_utc: "",
      },
      business_hours: {
        id: 0,
        timezone_name: "Africa/Kampala",
        start_hour: 8,
        end_hour: 18,
        working_days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
        updated_at_utc: "",
      },
      domain_controllers: [],
      logon_source_hosts: [],
      excluded_accounts: [],
      alert_rules: [],
      audit_policy_expectations: [],
      error: message,
    };
  }
}

export async function updateDomainSettings(payload: {
  name: string;
  domain_fqdn: string;
  ldap_server?: string | null;
  ldap_base_dn?: string | null;
  is_enabled?: boolean;
  is_default?: boolean;
  notes?: string | null;
}): Promise<MonitoredDomainConfig> {
  return writeJson<MonitoredDomainConfig>("/api/configuration/domains", "POST", payload);
}

export async function upsertDomainController(payload: {
  hostname: string;
  name?: string | null;
  event_fetch_interval_seconds?: number;
  is_enabled?: boolean;
  status?: string;
}): Promise<DomainControllerConfig> {
  return writeJson<DomainControllerConfig>("/api/configuration/domain-controllers", "POST", payload);
}

export async function getLogonSourceHosts(): Promise<{ hosts: string[] }> {
  try {
    return await fetchJson<{ hosts: string[] }>("/api/configuration/logon-source-hosts");
  } catch {
    return { hosts: [] };
  }
}

export async function updateLogonSourceHosts(payload: { hosts: string[] }): Promise<{ hosts: string[] }> {
  return writeJson<{ hosts: string[] }>("/api/configuration/logon-source-hosts", "PUT", payload);
}

export async function updateBusinessHours(payload: {
  timezone_name: string;
  start_hour: number;
  end_hour: number;
  working_days: string[];
}): Promise<BusinessHoursConfig> {
  return writeJson<BusinessHoursConfig>("/api/configuration/business-hours", "PUT", payload);
}

export async function addExcludedAccount(payload: {
  principal_name: string;
  reason?: string | null;
  is_enabled?: boolean;
}): Promise<ExcludedAccountConfig> {
  return writeJson<ExcludedAccountConfig>("/api/configuration/excluded-accounts", "POST", payload);
}

export async function removeExcludedAccount(itemId: number): Promise<{ ok: boolean }> {
  return writeJson<{ ok: boolean }>(`/api/configuration/excluded-accounts/${itemId}`, "DELETE");
}

export async function upsertAlertRule(payload: {
  key: string;
  display_name: string;
  description?: string | null;
  severity: string;
  threshold: number;
  window_minutes: number;
  channels?: string[];
  is_enabled: boolean;
}): Promise<AlertRuleConfig> {
  return writeJson<AlertRuleConfig>("/api/configuration/alert-rules", "POST", payload);
}

export async function upsertAuditPolicyExpectation(payload: {
  id?: number | null;
  policy_key: string;
  display_name: string;
  category?: string;
  required_state: string;
  rationale?: string | null;
}): Promise<AuditPolicyExpectation> {
  return writeJson<AuditPolicyExpectation>("/api/configuration/audit-policy", "POST", payload);
}

export async function getLogonSummary(): Promise<LogonSummary> {
  try {
    return await fetchJson<LogonSummary>("/api/logons/summary?limit=12");
  } catch (error) {
      shouldThrowApiFallback(error);
      return {
        total_count: 0,
        latest_activity_time_utc: null,
        top_users: [],
        top_failure_users: [],
        event_mix: [],
      };
  }
}

export async function getLogonQuery(params: {
  actor?: string;
  domainController?: string;
  eventType?: "Logon" | "Logoff" | "LogonFailure" | "AccountLockout";
  eventTypes?: Array<"Logon" | "Logoff" | "LogonFailure" | "AccountLockout">;
  sourceWorkstation?: string;
  sourceIpAddress?: string;
  logonType?: string;
  authenticationPackage?: string;
  search?: string;
  startTimeUtc?: string;
  endTimeUtc?: string;
  limit?: number;
  offset?: number;
}): Promise<LogonQueryResult> {
  const query = new URLSearchParams();
  if (params.actor) query.set("actor", params.actor);
  if (params.domainController) query.set("domain_controller", params.domainController);
  if (params.eventType) query.set("event_type", params.eventType);
  if (params.eventTypes) {
    for (const value of params.eventTypes) query.append("event_types", value);
  }
  if (params.sourceWorkstation) query.set("source_workstation", params.sourceWorkstation);
  if (params.sourceIpAddress) query.set("source_ip_address", params.sourceIpAddress);
  if (params.logonType) query.set("logon_type", params.logonType);
  if (params.authenticationPackage) query.set("authentication_package", params.authenticationPackage);
  if (params.search) query.set("search", params.search);
  if (params.startTimeUtc) query.set("start_time_utc", params.startTimeUtc);
  if (params.endTimeUtc) query.set("end_time_utc", params.endTimeUtc);
  query.set("limit", String(params.limit ?? 50));
  query.set("offset", String(params.offset ?? 0));

  try {
    return await fetchJson<LogonQueryResult>(`/api/logons/query?${query.toString()}`);
  } catch (error) {
    shouldThrowApiFallback(error);
    return {
      total_count: 0,
      limit: params.limit ?? 50,
      offset: params.offset ?? 0,
      rows: [],
    };
  }
}

export function buildLogonExportUrl(params: {
  actor?: string;
  domainController?: string;
  eventType?: "Logon" | "Logoff" | "LogonFailure" | "AccountLockout";
  eventTypes?: Array<"Logon" | "Logoff" | "LogonFailure" | "AccountLockout">;
  sourceWorkstation?: string;
  sourceIpAddress?: string;
  logonType?: string;
  authenticationPackage?: string;
  search?: string;
  startTimeUtc?: string;
  endTimeUtc?: string;
  limit?: number;
}) {
  const query = new URLSearchParams();
  if (params.actor) query.set("actor", params.actor);
  if (params.domainController) query.set("domain_controller", params.domainController);
  if (params.eventType) query.set("event_type", params.eventType);
  if (params.eventTypes) {
    for (const value of params.eventTypes) query.append("event_types", value);
  }
  if (params.sourceWorkstation) query.set("source_workstation", params.sourceWorkstation);
  if (params.sourceIpAddress) query.set("source_ip_address", params.sourceIpAddress);
  if (params.logonType) query.set("logon_type", params.logonType);
  if (params.authenticationPackage) query.set("authentication_package", params.authenticationPackage);
  if (params.search) query.set("search", params.search);
  if (params.startTimeUtc) query.set("start_time_utc", params.startTimeUtc);
  if (params.endTimeUtc) query.set("end_time_utc", params.endTimeUtc);
  query.set("limit", String(params.limit ?? 5000));
  return `${buildApiUrl("/api/logons/export.csv")}?${query.toString()}`;
}

export async function getSetupStatus(): Promise<SetupStatus> {
  try {
    return await fetchJson<SetupStatus>("/api/setup/status");
  } catch (error) {
    shouldThrowApiFallback(error);
    return {
      onboarding_required: true,
      onboarding_completed: false,
      completed_at_utc: null,
      last_bootstrap_at_utc: null,
      checks: {
        has_domain: false,
        has_ldap_credentials: false,
        has_winrm_credentials: false,
        has_domain_controllers: false,
      },
      prefill: {
        domain_name: "",
        domain_fqdn: "",
        ldap_server: "",
        ldap_base_dn: "",
        ldap_bind_dn: "",
        domain_controllers: [],
        winrm_username: "",
        winrm_domain: "",
        winrm_auth: "ntlm",
        winrm_use_ssl: true,
        winrm_port: 5986,
        business_hours_timezone: "Africa/Kampala",
        business_hours_start: 8,
        business_hours_end: 18,
        working_days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
      },
    };
  }
}

export async function bootstrapSetup(payload: {
  domain_name: string;
  domain_fqdn: string;
  ldap_server: string;
  ldap_base_dn: string;
  ldap_bind_dn: string;
  ldap_bind_password: string;
  domain_controllers: string[];
  winrm_username: string;
  winrm_domain: string;
  winrm_password: string;
  winrm_auth: string;
  winrm_use_ssl: boolean;
  winrm_port: number;
  business_hours_timezone: string;
  business_hours_start: number;
  business_hours_end: number;
  working_days: string[];
}) {
  return writeJson<SetupStatus>("/api/setup/bootstrap", "POST", payload, { timeoutMs: 60000 });
}

export async function loginWithAd(payload: { username: string; password: string }) {
  return writeJson<{ token: string; username: string; display_name: string; expires_at_utc: string }>(
    "/api/auth/login",
    "POST",
    payload,
    { timeoutMs: 30000 },
  );
}

export async function getAuthSession() {
  return fetchJson<AuthSession>("/api/auth/session");
}

export async function logoutAuthSession() {
  return writeJson<{ ok: boolean }>("/api/auth/logout", "POST");
}

export async function testSetupLdap(payload: {
  ldap_server: string;
  ldap_bind_dn: string;
  ldap_bind_password: string;
}) {
  return writeJson<{ ok: boolean; server: string; bound: boolean }>("/api/setup/test-ldap", "POST", payload, { timeoutMs: 30000 });
}

export async function testSetupWinrm(payload: {
  hostname: string;
  winrm_username: string;
  winrm_domain: string;
  winrm_password: string;
  winrm_auth: string;
  winrm_use_ssl: boolean;
  winrm_port: number;
}) {
  return writeJson<{ ok: boolean; hostname: string; computer_name: string }>("/api/setup/test-winrm", "POST", payload, { timeoutMs: 30000 });
}

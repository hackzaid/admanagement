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
  repository?: string | null;
  channel?: string | null;
  branch?: string | null;
  checked_at_utc?: string | null;
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

export type DashboardOverview = {
  snapshot_summary: SnapshotSummary;
  activity_summary: MetricSummary;
  logon_summary: LogonSummary;
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
  isFallback?: boolean;
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
  excluded_accounts: ExcludedAccountConfig[];
  alert_rules: AlertRuleConfig[];
  audit_policy_expectations: AuditPolicyExpectation[];
};

export type LogonSummary = {
  total_count: number;
  latest_activity_time_utc?: string | null;
  top_users: Array<{ actor: string; count: number }>;
  top_failure_users?: Array<{ actor: string; count: number }>;
  event_mix: Array<{ event_type: string; count: number }>;
  event_counts?: Record<string, number>;
  top_failure_sources?: Array<{ source: string; count: number }>;
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

function getApiBaseUrl() {
  if (typeof window === "undefined") {
    return process.env.INTERNAL_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL;
  }
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL;
}

function describeNetworkError(error: unknown, apiBaseUrl: string, path: string) {
  const endpoint = `${apiBaseUrl}${path}`;
  if (error instanceof DOMException && error.name === "TimeoutError") {
    return `API request timed out while contacting ${endpoint}. Check whether the backend is running and reachable from the browser.`;
  }
  if (error instanceof Error) {
    return `Could not reach the API at ${endpoint}. Check NEXT_PUBLIC_API_BASE_URL, backend port publishing, allowed frontend origins, and whether the backend is up. Browser error: ${error.message}`;
  }
  return `Could not reach the API at ${endpoint}. Check NEXT_PUBLIC_API_BASE_URL, backend connectivity, and allowed frontend origins.`;
}

async function fetchJson<T>(path: string): Promise<T> {
  const apiBaseUrl = getApiBaseUrl();
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      next: { revalidate: 30 },
      signal: AbortSignal.timeout(5000),
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
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
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
  } catch {
    return {
      status: "unknown",
      current_version: "0.1.0",
      update_available: false,
      error: "Update status is unavailable.",
      upgrade_instructions: [],
    };
  }
}

export async function getSystemOverview(refresh = false): Promise<SystemOverview> {
  try {
    return await fetchJson<SystemOverview>(`/api/system/overview${refresh ? "?refresh=true" : ""}`);
  } catch {
    return {
      health: {
        status: "unknown",
        app: "admanagement",
        environment: "unknown",
        version: "0.1.0",
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
        update_available: false,
        error: "System overview is unavailable.",
      },
    };
  }
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
    return await fetchJson<DashboardOverview>(`/api/dashboard${suffix}`);
  } catch {
    return {
      snapshot_summary: {
        run_id: "preview-mode",
        captured_at_utc: null,
        counts: { user: 1519, computer: 887, group: 85, privileged_group: 5 },
        findings: {
          stale_users: { count: 135, sample: [] },
          stale_computers: { count: 526, sample: [] },
          password_never_expires: { count: 7, sample: [] },
          privileged_groups: {
            "Domain Admins": { member_count: 12, sample_members: ["degesa", "ldapreset", "sccmadmin"] },
            "Enterprise Admins": { member_count: 10, sample_members: ["degesa", "mnabulya", "fnabunya"] },
            Administrators: { member_count: 14, sample_members: ["SCCM Administrator", "degesa", "Faith Nabunya"] },
          },
        },
      },
      activity_summary: {
        total_count: 619,
        latest_activity_time_utc: "Preview mode",
        top_actors: [
          { actor: "degesa", count: 1808 },
          { actor: "gamito", count: 220 },
          { actor: "mnabulya", count: 175 },
          { actor: "fnabunya", count: 88 },
        ],
        action_counts: [
          { target_type: "Computer", action: "Modify", count: 3006 },
          { target_type: "User", action: "Modify", count: 1085 },
          { target_type: "User", action: "Delete", count: 52 },
          { target_type: "User", action: "Create", count: 16 },
        ],
        recent_deletes: [],
      },
      logon_summary: {
        total_count: 264,
        latest_activity_time_utc: "Preview mode",
        top_users: [
          { actor: "administrator", count: 88 },
          { actor: "svc-adfs", count: 47 },
          { actor: "degesa", count: 28 },
        ],
        top_failure_users: [
          { actor: "administrator", count: 41 },
          { actor: "svc-backup", count: 19 },
          { actor: "guest", count: 8 },
        ],
        event_mix: [
          { event_type: "Logon", count: 121 },
          { event_type: "LogonFailure", count: 96 },
          { event_type: "Logoff", count: 35 },
          { event_type: "AccountLockout", count: 12 },
        ],
        event_counts: {
          Logon: 121,
          LogonFailure: 96,
          Logoff: 35,
          AccountLockout: 12,
        },
        top_failure_sources: [
          { source: "WS-AD-01", count: 54 },
          { source: "192.168.10.24", count: 21 },
          { source: "Unknown", count: 9 },
        ],
      },
      recent_activity: [
        {
          time_utc: "Preview",
          actor: "degesa",
          action: "Modify",
          target_type: "User",
          target_name: "Guest",
          domain_controller: "WATUUGDC",
          source_workstation: "ADMIN-WS",
          source_ip_address: "192.168.10.25",
        },
      ],
      scheduler: {
        enabled: false,
        running: false,
        jobs: [],
      },
      filters: {
        start_time_utc: params?.startTimeUtc ?? null,
        end_time_utc: params?.endTimeUtc ?? null,
      },
      isFallback: true,
    };
  }
}

export async function getSnapshotRuns(): Promise<SnapshotRun[]> {
  try {
    return await fetchJson<SnapshotRun[]>("/api/snapshots/runs?limit=12");
  } catch {
    return [];
  }
}

export async function getSnapshotSummary(): Promise<SnapshotSummary> {
  try {
    return await fetchJson<SnapshotSummary>("/api/snapshots/summary");
  } catch {
    return {
      run_id: null,
      captured_at_utc: null,
      counts: {},
      findings: {},
    };
  }
}

export async function getActivitySummary(): Promise<MetricSummary> {
  try {
    return await fetchJson<MetricSummary>("/api/activity/summary?limit=12");
  } catch {
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
  } catch {
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
  } catch {
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
  return `${getApiBaseUrl()}/api/activity/export.csv?${query.toString()}`;
}

export async function getReportCatalog(): Promise<ReportCatalogItem[]> {
  try {
    return await fetchJson<ReportCatalogItem[]>("/api/reports/catalog");
  } catch {
    return [];
  }
}

export async function getSavedReports(): Promise<SavedReport[]> {
  try {
    return await fetchJson<SavedReport[]>("/api/reports/saved");
  } catch {
    return [];
  }
}

export async function getSavedDashboardViews(): Promise<SavedDashboardView[]> {
  try {
    return await fetchJson<SavedDashboardView[]>("/api/reports/saved-views?view_scope=dashboard");
  } catch {
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
  } catch {
    return {
      must_have_modules: [
        { key: "domain_settings", title: "Domain Settings", why: "Keep the monitored directory and bind scope explicit." },
        { key: "domain_controllers", title: "Domain Controllers", why: "Collector health and target coverage matter daily." },
        { key: "audit_policy", title: "Audit Policy Baseline", why: "Missing audit settings break the evidence plane." },
        { key: "alerts_reports", title: "Alerts and Reports", why: "Alert tuning is what prevents noise from winning." },
        { key: "business_hours", title: "Business Hours", why: "After-hours changes should stand out immediately." },
        { key: "excluded_accounts", title: "Excluded Accounts", why: "Service-account noise needs controlled suppression." },
      ],
      defer_modules: ["Disk space analysis", "Archive restore", "SIEM integration", "Ticketing integration", "Personalize"],
      domain: {
        id: 1,
        name: "Default Domain",
        domain_fqdn: "example.local",
        ldap_server: "ldaps://dc01.example.local",
        ldap_base_dn: "DC=example,DC=local",
        is_enabled: true,
        is_default: true,
        notes: "Preview configuration",
        updated_at_utc: "Preview",
      },
      business_hours: {
        id: 1,
        timezone_name: "Africa/Kampala",
        start_hour: 8,
        end_hour: 18,
        working_days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
        updated_at_utc: "Preview",
      },
      domain_controllers: [],
      excluded_accounts: [],
      alert_rules: [],
      audit_policy_expectations: [],
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
  } catch {
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
  if (params.search) query.set("search", params.search);
  if (params.startTimeUtc) query.set("start_time_utc", params.startTimeUtc);
  if (params.endTimeUtc) query.set("end_time_utc", params.endTimeUtc);
  query.set("limit", String(params.limit ?? 50));
  query.set("offset", String(params.offset ?? 0));

  try {
    return await fetchJson<LogonQueryResult>(`/api/logons/query?${query.toString()}`);
  } catch {
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
  if (params.search) query.set("search", params.search);
  if (params.startTimeUtc) query.set("start_time_utc", params.startTimeUtc);
  if (params.endTimeUtc) query.set("end_time_utc", params.endTimeUtc);
  query.set("limit", String(params.limit ?? 5000));
  return `${getApiBaseUrl()}/api/logons/export.csv?${query.toString()}`;
}

export async function getSetupStatus(): Promise<SetupStatus> {
  try {
    return await fetchJson<SetupStatus>("/api/setup/status");
  } catch {
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

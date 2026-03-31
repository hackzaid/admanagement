export type MenuLeaf = {
  type: "item";
  label: string;
  href: string;
  reportKey?: string;
};

export type MenuGroup = {
  type: "group";
  label: string;
  children: MenuLeaf[];
  defaultOpen?: boolean;
};

export type MenuEntry = MenuLeaf | MenuGroup;

export const menuEntries: MenuEntry[] = [
  { type: "item", label: "User Logon Reports", href: "/reports/user-logon-reports", reportKey: "user-logon-reports" },
  { type: "item", label: "Local Logon-Logoff", href: "/reports/local-logon-logoff", reportKey: "local-logon-logoff" },
  { type: "item", label: "ADFS Auditing", href: "/reports/adfs-auditing", reportKey: "adfs-auditing" },
  {
    type: "group",
    label: "Account Management",
    defaultOpen: true,
    children: [
      { type: "item", label: "All AD Changes", href: "/reports/account-management/all-ad-changes", reportKey: "all-ad-changes" },
      {
        type: "item",
        label: "All AD Changes By User",
        href: "/reports/account-management/all-ad-changes-by-user",
        reportKey: "all-ad-changes-by-user",
      },
      {
        type: "item",
        label: "All AD Changes on DCs",
        href: "/reports/account-management/all-ad-changes-on-dcs",
        reportKey: "all-ad-changes-on-dcs",
      },
      { type: "item", label: "User Management", href: "/reports/account-management/user-management", reportKey: "user-management" },
      { type: "item", label: "Group Management", href: "/reports/account-management/group-management", reportKey: "group-management" },
      {
        type: "item",
        label: "Computer Management",
        href: "/reports/account-management/computer-management",
        reportKey: "computer-management",
      },
      { type: "item", label: "OU Management", href: "/reports/account-management/ou-management", reportKey: "ou-management" },
      { type: "item", label: "GPO Management", href: "/reports/account-management/gpo-management", reportKey: "gpo-management" },
      {
        type: "item",
        label: "Administrative User Actions",
        href: "/reports/account-management/administrative-user-actions",
        reportKey: "administrative-user-actions",
      },
    ],
  },
  { type: "item", label: "User Management", href: "/reports/user-management", reportKey: "user-management" },
  { type: "item", label: "Group Management", href: "/reports/group-management", reportKey: "group-management" },
  { type: "item", label: "Computer Management", href: "/reports/computer-management", reportKey: "computer-management" },
  { type: "item", label: "OU Management", href: "/reports/ou-management", reportKey: "ou-management" },
  { type: "item", label: "GPO Management", href: "/reports/gpo-management", reportKey: "gpo-management" },
  { type: "item", label: "GPO Setting Changes", href: "/reports/gpo-setting-changes", reportKey: "gpo-setting-changes" },
  {
    type: "item",
    label: "Other AD Object Changes",
    href: "/reports/other-ad-object-changes",
    reportKey: "other-ad-object-changes",
  },
  { type: "item", label: "Permission Changes", href: "/reports/permission-changes", reportKey: "permission-changes" },
  {
    type: "item",
    label: "Configuration Auditing",
    href: "/reports/configuration-auditing",
    reportKey: "configuration-auditing",
  },
  { type: "item", label: "DNS Changes", href: "/reports/dns-changes", reportKey: "dns-changes" },
];

export type ReportDefinition = {
  key: string;
  title: string;
  category: string;
  description: string;
  capability: "activity" | "snapshot" | "mixed" | "planned";
};

export const reportDefinitions: Record<string, ReportDefinition> = {
  "user-logon-reports": {
    key: "user-logon-reports",
    title: "User Logon Reports",
    category: "Identity Access",
    description: "Track observed domain logons, failed sign-ins, and account lockouts with source workstation, IP, and domain controller context.",
    capability: "activity",
  },
  "local-logon-logoff": {
    key: "local-logon-logoff",
    title: "Local Logon-Logoff",
    category: "Endpoint Access",
    description: "Review successful logon and logoff session activity captured from domain controller Security logs for the current environment.",
    capability: "activity",
  },
  "adfs-auditing": {
    key: "adfs-auditing",
    title: "ADFS Auditing",
    category: "Federation",
    description: "Expose ADFS sign-in, token issuance, and trust activity when federation logs are onboarded.",
    capability: "planned",
  },
  "all-ad-changes": {
    key: "all-ad-changes",
    title: "All AD Changes",
    category: "Account Management",
    description: "Review every captured administrative CRUD action across users, computers, OUs, and GPO-linked activity.",
    capability: "activity",
  },
  "all-ad-changes-by-user": {
    key: "all-ad-changes-by-user",
    title: "All AD Changes By User",
    category: "Account Management",
    description: "Pivot AD changes by operator to identify concentration, outliers, and privilege-heavy activity.",
    capability: "activity",
  },
  "all-ad-changes-on-dcs": {
    key: "all-ad-changes-on-dcs",
    title: "All AD Changes on DCs",
    category: "Account Management",
    description: "Compare event volume and change patterns per domain controller to spot operational hotspots.",
    capability: "activity",
  },
  "user-management": {
    key: "user-management",
    title: "User Management",
    category: "Identity Objects",
    description: "Focus on user account creation, modification, deletion, inactivity, and password-policy exceptions.",
    capability: "mixed",
  },
  "group-management": {
    key: "group-management",
    title: "Group Management",
    category: "Identity Objects",
    description: "Review privileged group exposure, membership drift, and operator behavior around access groups.",
    capability: "mixed",
  },
  "computer-management": {
    key: "computer-management",
    title: "Computer Management",
    category: "Identity Objects",
    description: "Monitor computer object churn, stale assets, and change operations tied to workstation and server identities.",
    capability: "mixed",
  },
  "ou-management": {
    key: "ou-management",
    title: "OU Management",
    category: "Directory Structure",
    description: "Track organizational unit changes and delegated administrative scope as collectors deepen.",
    capability: "planned",
  },
  "gpo-management": {
    key: "gpo-management",
    title: "GPO Management",
    category: "Policy Control",
    description: "Track GPO object changes and policy-related administrative actions with emphasis on high-impact linked policies.",
    capability: "activity",
  },
  "administrative-user-actions": {
    key: "administrative-user-actions",
    title: "Administrative User Actions",
    category: "Operator Oversight",
    description: "Surface high-volume change operators, recent changes, and risky user-focused administrative actions.",
    capability: "activity",
  },
  "gpo-setting-changes": {
    key: "gpo-setting-changes",
    title: "GPO Setting Changes",
    category: "Policy Control",
    description: "Provide deeper breakdowns for setting-level changes as GPO parsing expands beyond object-level events.",
    capability: "planned",
  },
  "other-ad-object-changes": {
    key: "other-ad-object-changes",
    title: "Other AD Object Changes",
    category: "Directory Structure",
    description: "Catch residual directory changes that do not fit standard user, computer, or GPO categories.",
    capability: "planned",
  },
  "permission-changes": {
    key: "permission-changes",
    title: "Permission Changes",
    category: "Access Control",
    description: "Expose delegated permission changes, ACL drift, and Tier 0 permission anomalies as ACL collection grows.",
    capability: "planned",
  },
  "configuration-auditing": {
    key: "configuration-auditing",
    title: "Configuration Auditing",
    category: "Compliance",
    description: "Watch domain-level policy and security configuration posture through recurring snapshot analysis.",
    capability: "snapshot",
  },
  "dns-changes": {
    key: "dns-changes",
    title: "DNS Changes",
    category: "Infrastructure",
    description: "Bring DNS object and record changes into the same operator-centric audit plane.",
    capability: "planned",
  },
};

export function getReportDefinitionByPath(pathname: string): ReportDefinition | undefined {
  const entry = menuEntries
    .flatMap((entry) => (entry.type === "group" ? entry.children : [entry]))
    .find((entry) => entry.href === pathname);

  return entry?.reportKey ? reportDefinitions[entry.reportKey] : undefined;
}

export function getReportDefinitionBySlug(slug: string[]): ReportDefinition | undefined {
  const key = slug[slug.length - 1];
  return reportDefinitions[key];
}

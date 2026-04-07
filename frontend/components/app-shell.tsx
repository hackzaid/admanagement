"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useMemo, useState } from "react";

import { AuthSession, UpdateStatus, applySystemUpdate, getAuthSession, getUpdateStatus, logoutAuthSession } from "@/lib/api";
import { getReportDefinitionByPath, menuEntries } from "@/lib/navigation";

const primaryNav = [
  { href: "/", label: "Overview" },
  { href: "/activity", label: "AD Changes" },
  { href: "/snapshots", label: "Compliance" },
  { href: "/reports/account-management/all-ad-changes", label: "Reports" },
  { href: "/configuration", label: "Configuration" },
  { href: "/system", label: "System" },
];

export function AppShell({
  children,
  title,
  subtitle,
  eyebrow = "Active Directory",
  heroMode = "default",
}: {
  children: ReactNode;
  title: string;
  subtitle: string;
  eyebrow?: string;
  heroMode?: "default" | "none";
}) {
  const pathname = usePathname();
  const activeReport = getReportDefinitionByPath(pathname);
  const defaultOpenGroups = useMemo(
    () =>
      Object.fromEntries(
        menuEntries
          .filter((entry) => entry.type === "group")
          .map((entry) => [
            entry.label,
            entry.defaultOpen || entry.children.some((child) => child.href === pathname),
          ]),
      ),
    [pathname],
  );
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(defaultOpenGroups);
  const [navOpen, setNavOpen] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);
  const [updateChecking, setUpdateChecking] = useState(false);
  const [updateApplying, setUpdateApplying] = useState(false);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [dismissedUpdateKey, setDismissedUpdateKey] = useState("");

  useEffect(() => {
    setOpenGroups(defaultOpenGroups);
  }, [defaultOpenGroups]);

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    let active = true;

    document.documentElement.dataset.theme = "slate";
    if (typeof window !== "undefined") {
      setDismissedUpdateKey(window.localStorage.getItem("admanagement_dismissed_update") ?? "");
    }

    void getUpdateStatus().then((result) => {
      if (active) {
        setUpdateStatus(result);
      }
    });
    void getAuthSession().then((result) => {
      if (active) {
        setSession(result);
      }
    }).catch(() => {
      if (active) {
        setSession(null);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  const toggleGroup = (label: string) => {
    setOpenGroups((current) => ({ ...current, [label]: !current[label] }));
  };

  const refreshUpdateStatus = async () => {
    setUpdateChecking(true);
    try {
      const result = await getUpdateStatus(true);
      setUpdateStatus(result);
    } finally {
      setUpdateChecking(false);
    }
  };

  const applyUpdate = async () => {
    setUpdateApplying(true);
    try {
      await applySystemUpdate();
      const refreshed = await getUpdateStatus(true);
      setUpdateStatus(refreshed);
    } finally {
      setUpdateApplying(false);
    }
  };

  const logout = async () => {
    try {
      await logoutAuthSession();
    } finally {
      document.cookie = "admanagement_session=; Path=/; Max-Age=0; SameSite=Lax";
      window.location.href = "/login";
    }
  };

  const buildStatusLabel = updateStatus?.update_available
    ? "Update available"
    : updateStatus?.status === "ok"
      ? "Up to date"
      : updateStatus?.status === "error"
        ? "Check failed"
        : "Pending";

  const trackedBranchLabel = updateStatus?.branch || "main";
  const repositoryLabel = updateStatus?.repository?.split("/").slice(-1)[0] || "admanagement";
  const currentBuildLabel = updateStatus?.current_ref?.slice(0, 7) ?? `v${updateStatus?.current_version ?? "0.1.0"}`;
  const latestUpdateKey = updateStatus?.latest_ref || updateStatus?.latest_version || "";
  const showUpdateBanner = Boolean(updateStatus?.update_available && latestUpdateKey && dismissedUpdateKey !== latestUpdateKey);
  const visibleUpdateStatus = showUpdateBanner ? updateStatus : null;

  const dismissUpdateBanner = () => {
    if (!latestUpdateKey || typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem("admanagement_dismissed_update", latestUpdateKey);
    setDismissedUpdateKey(latestUpdateKey);
  };

  return (
    <div className={`shell${navOpen ? " shell-mobile-open" : ""}`}>
      <aside className={`side-rail${navOpen ? " side-rail-open" : ""}`}>
        <div className="brand-mark">
          <div className="brand-ring" />
          <div>
            <div className="brand-title">AD Management</div>
            <div className="brand-subtitle">Directory Audit Console</div>
          </div>
        </div>

        <div className="directory-switch">
          <div className="directory-tab directory-tab-active">
            <span className="directory-icon">AD</span>
            <span>Active Directory</span>
          </div>
        </div>

        <div className="side-stack">
          {menuEntries.map((entry) =>
            entry.type === "group" ? (
              <section className="side-group" key={entry.label}>
                <button className="side-toggle" onClick={() => toggleGroup(entry.label)} type="button">
                  <span>{entry.label}</span>
                  <span className={`toggle-arrow${openGroups[entry.label] ? " toggle-arrow-open" : ""}`}>{">"}</span>
                </button>
                {openGroups[entry.label] ? (
                  <div className="side-items side-items-nested">
                    {entry.children.map((child) => (
                      <Link
                        className={`side-item${pathname === child.href ? " side-item-active" : ""}`}
                        href={child.href}
                        key={child.href}
                      >
                        <span className="side-dot" />
                        <span>{child.label}</span>
                      </Link>
                    ))}
                  </div>
                ) : null}
              </section>
            ) : (
              <Link
                className={`side-item side-item-top${pathname === entry.href ? " side-item-active" : ""}`}
                href={entry.href}
                key={entry.href}
              >
                <span className="side-dot" />
                <span>{entry.label}</span>
                <span className="side-chevron">{">"}</span>
              </Link>
            ),
          )}
        </div>
      </aside>

      <button
        aria-label="Close navigation"
        className={`shell-overlay${navOpen ? " shell-overlay-active" : ""}`}
        onClick={() => setNavOpen(false)}
        type="button"
      />

      <div className="workspace">
        <header className="topbar">
          <div className="topbar-leading">
            <button
              aria-expanded={navOpen}
              aria-label="Open navigation"
              className="nav-toggle"
              onClick={() => setNavOpen((current) => !current)}
              type="button"
            >
              Menu
            </button>
            <div className="topbar-links">
              {primaryNav.map((item) => (
                <Link
                  className={`topbar-link${pathname === item.href ? " topbar-link-active" : ""}`}
                  href={item.href}
                  key={item.href}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="topbar-actions">
            <div className="topbar-context">
              <div className="topbar-identity">
                {session ? (
                  <>
                    <strong>{session.display_name || session.username}</strong>
                    <span>{session.username}</span>
                  </>
                ) : (
                  <span>Signed out</span>
                )}
              </div>
              <div className="topbar-runtime">
                <div className="topbar-runtime-item">
                  <span className="topbar-runtime-label">Tracking</span>
                  <strong>{trackedBranchLabel}</strong>
                  <small>{repositoryLabel}</small>
                </div>
                <div className="topbar-runtime-item topbar-runtime-item-accent">
                  <span className="topbar-runtime-label">Build</span>
                  <strong>{buildStatusLabel}</strong>
                  <small>{currentBuildLabel}</small>
                </div>
              </div>
            </div>
            <div className="topbar-button-group">
              <button className="topbar-link" onClick={() => void refreshUpdateStatus()} type="button">
                {updateChecking ? "Checking..." : "Check updates"}
              </button>
              <button className="topbar-link" onClick={() => void logout()} type="button">
                Sign out
              </button>
            </div>
          </div>
        </header>

        {visibleUpdateStatus ? (
          <section className="update-banner">
            <div className="update-banner-copy">
              <strong>
                Update available: {visibleUpdateStatus.latest_version ? `v${visibleUpdateStatus.latest_version}` : visibleUpdateStatus.latest_ref?.slice(0, 7) ?? "new build"}
              </strong>
              <span>
                Current build {visibleUpdateStatus.current_ref?.slice(0, 7) ?? `v${visibleUpdateStatus.current_version}`}
                {visibleUpdateStatus.latest_published_at_utc ? ` | Released ${new Date(visibleUpdateStatus.latest_published_at_utc).toLocaleDateString()}` : ""}
              </span>
              {visibleUpdateStatus.release_notes_excerpt ? <p>{visibleUpdateStatus.release_notes_excerpt}</p> : null}
              {visibleUpdateStatus.upgrade_instructions?.length ? (
                <code className="update-banner-command">{visibleUpdateStatus.upgrade_instructions.join(" && ")}</code>
              ) : null}
            </div>
            <div className="update-banner-actions">
              <button className="hero-pill" onClick={() => void applyUpdate()} type="button">
                {updateApplying ? "Starting update..." : "Apply update"}
              </button>
              {visibleUpdateStatus.latest_release_url ? (
                <a className="hero-pill" href={visibleUpdateStatus.latest_release_url} rel="noreferrer" target="_blank">
                  View release
                </a>
              ) : null}
              <button className="hero-pill hero-pill-outline" onClick={() => void refreshUpdateStatus()} type="button">
                Refresh
              </button>
              <button className="hero-pill hero-pill-outline" onClick={dismissUpdateBanner} type="button">
                Close
              </button>
            </div>
          </section>
        ) : null}

        <main className="content">
          {heroMode === "default" ? (
            <section className="hero-panel">
              <div className="hero-copy">
                <div className="eyebrow">{eyebrow}</div>
                <h1>{title}</h1>
                <p>{subtitle}</p>
              </div>
              <div className="hero-actions">
                <div className="hero-pill">{activeReport?.category ?? "Operational visibility"}</div>
                <div className="hero-pill hero-pill-outline">
                  {activeReport ? `${activeReport.capability} coverage` : "Privilege-aware reporting"}
                </div>
              </div>
            </section>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  );
}

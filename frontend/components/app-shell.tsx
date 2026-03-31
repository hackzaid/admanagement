"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useMemo, useState } from "react";

import { UpdateStatus, getUpdateStatus } from "@/lib/api";
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
  const [theme, setTheme] = useState<"linen" | "slate" | "signal">("slate");
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);
  const [updateChecking, setUpdateChecking] = useState(false);

  useEffect(() => {
    setOpenGroups(defaultOpenGroups);
  }, [defaultOpenGroups]);

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("admanagement-theme");
    const nextTheme =
      storedTheme === "slate" || storedTheme === "signal" || storedTheme === "linen"
        ? storedTheme
        : "slate";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("admanagement-theme", theme);
  }, [theme]);

  useEffect(() => {
    let active = true;

    void getUpdateStatus().then((result) => {
      if (active) {
        setUpdateStatus(result);
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
              ≡
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
            <div className="theme-switcher" role="group" aria-label="Theme">
              {[
                { key: "linen", label: "Linen" },
                { key: "slate", label: "Slate" },
                { key: "signal", label: "Signal" },
              ].map((item) => (
                <button
                  className={`theme-chip${theme === item.key ? " theme-chip-active" : ""}`}
                  key={item.key}
                  onClick={() => setTheme(item.key as "linen" | "slate" | "signal")}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </div>
            <button className="topbar-link" onClick={() => void refreshUpdateStatus()} type="button">
              {updateChecking ? "Checking..." : "Check updates"}
            </button>
            <div className="status-chip">Live Monitor</div>
            <div className="status-chip status-chip-muted">Multi-Domain Ready</div>
          </div>
        </header>

        {updateStatus?.update_available ? (
          <section className="update-banner">
            <div className="update-banner-copy">
              <strong>
                Update available: v{updateStatus.latest_version}
              </strong>
              <span>
                Current version v{updateStatus.current_version}
                {updateStatus.latest_published_at_utc ? ` · Released ${new Date(updateStatus.latest_published_at_utc).toLocaleDateString()}` : ""}
              </span>
              {updateStatus.release_notes_excerpt ? <p>{updateStatus.release_notes_excerpt}</p> : null}
              {updateStatus.upgrade_instructions?.length ? (
                <code className="update-banner-command">{updateStatus.upgrade_instructions.join(" && ")}</code>
              ) : null}
            </div>
            <div className="update-banner-actions">
              {updateStatus.latest_release_url ? (
                <a className="hero-pill" href={updateStatus.latest_release_url} rel="noreferrer" target="_blank">
                  View release
                </a>
              ) : null}
              <button className="hero-pill hero-pill-outline" onClick={() => void refreshUpdateStatus()} type="button">
                Refresh
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

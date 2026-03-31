"use client";

import { useState } from "react";

import { SectionPanel } from "@/components/cards";
import { ConfigurationOverview, DomainControllerConfig, upsertDomainController } from "@/lib/api";
import { formatDisplayDateTime } from "@/lib/datetime";

import { ConfigurationShell } from "./config-shell";
import { PaginationFooter, usePagination } from "./paginated-table";

function formatInterval(seconds: number) {
  if (seconds % 3600 === 0) return `${seconds / 3600}h`;
  if (seconds % 60 === 0) return `${seconds / 60}m`;
  return `${seconds}s`;
}

function intValue(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function DomainControllersWorkspace({ overview }: { overview: ConfigurationOverview }) {
  const [controllers, setControllers] = useState<DomainControllerConfig[]>(overview.domain_controllers);
  const [newController, setNewController] = useState({
    hostname: "",
    name: "",
    event_fetch_interval_seconds: "300",
    is_enabled: true,
    status: "configured",
  });
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pagination = usePagination(controllers, 10);

  function patchController(id: number, patch: Partial<DomainControllerConfig>) {
    setControllers((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  async function runAction(key: string, action: () => Promise<void>, successMessage: string) {
    setSavingKey(key);
    setMessage(null);
    setError(null);
    try {
      await action();
      setMessage(successMessage);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Update failed.");
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <ConfigurationShell
      overview={{ ...overview, domain_controllers: controllers }}
      subtitle="Manage collector targets, fetch cadence, and controller status without sharing space with unrelated configuration."
      title="Domain Controllers"
    >
      {message ? <div className="banner">{message}</div> : null}
      {error ? <div className="banner banner-danger">{error}</div> : null}

      <SectionPanel kicker="Collector execution plane" title="Available Domain Controllers">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Hostname</th>
                <th>Fetch Interval</th>
                <th>Status</th>
                <th>Enabled</th>
                <th>Last Activity Event</th>
                <th>Last Logon Event</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {pagination.pagedRows.length ? (
                pagination.pagedRows.map((item) => (
                  <tr key={item.id}>
                    <td><input className="table-input" value={item.name} onChange={(event) => patchController(item.id, { name: event.target.value })} /></td>
                    <td>{item.hostname}</td>
                    <td>
                      <input className="table-input table-input-small" max={86400} min={60} type="number" value={item.event_fetch_interval_seconds} onChange={(event) => patchController(item.id, { event_fetch_interval_seconds: intValue(event.target.value, item.event_fetch_interval_seconds) })} />
                      <div className="table-note">{formatInterval(item.event_fetch_interval_seconds)}</div>
                    </td>
                    <td>
                      <select className="table-input" value={item.status} onChange={(event) => patchController(item.id, { status: event.target.value })}>
                        <option value="configured">Configured</option>
                        <option value="listening">Listening</option>
                        <option value="paused">Paused</option>
                        <option value="error">Error</option>
                      </select>
                    </td>
                    <td>
                      <label className="config-toggle config-toggle-inline">
                        <input checked={item.is_enabled} onChange={(event) => patchController(item.id, { is_enabled: event.target.checked })} type="checkbox" />
                        <span>{item.is_enabled ? "Yes" : "No"}</span>
                      </label>
                    </td>
                    <td>{formatDisplayDateTime(item.last_activity_event_time_utc, "-")}</td>
                    <td>{formatDisplayDateTime(item.last_logon_event_time_utc, "-")}</td>
                    <td>
                      <button
                        className="table-action"
                        disabled={savingKey === `controller-${item.id}`}
                        onClick={() =>
                          void runAction(
                            `controller-${item.id}`,
                            async () => {
                              const saved = await upsertDomainController({
                                hostname: item.hostname,
                                name: item.name,
                                event_fetch_interval_seconds: item.event_fetch_interval_seconds,
                                is_enabled: item.is_enabled,
                                status: item.status,
                              });
                              patchController(item.id, saved);
                            },
                            `Updated controller ${item.hostname}.`,
                          )
                        }
                        type="button"
                      >
                        {savingKey === `controller-${item.id}` ? "Saving..." : "Save"}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={8}>No domain controllers configured yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <PaginationFooter
          onPageChange={pagination.setPage}
          onPageSizeChange={pagination.setPageSize}
          page={pagination.page}
          pageSize={pagination.pageSize}
          totalPages={pagination.totalPages}
          totalRows={pagination.totalRows}
        />
      </SectionPanel>

      <SectionPanel kicker="Add collector target" title="New Domain Controller">
        <div className="config-form-grid">
          <label className="config-field">
            <span>Display Name</span>
            <input value={newController.name} onChange={(event) => setNewController((current) => ({ ...current, name: event.target.value }))} />
          </label>
          <label className="config-field">
            <span>Hostname</span>
            <input placeholder="dc01.example.local" value={newController.hostname} onChange={(event) => setNewController((current) => ({ ...current, hostname: event.target.value }))} />
          </label>
          <label className="config-field">
            <span>Fetch Interval Seconds</span>
            <input max={86400} min={60} type="number" value={newController.event_fetch_interval_seconds} onChange={(event) => setNewController((current) => ({ ...current, event_fetch_interval_seconds: event.target.value }))} />
          </label>
          <label className="config-field">
            <span>Status</span>
            <select className="table-input" value={newController.status} onChange={(event) => setNewController((current) => ({ ...current, status: event.target.value }))}>
              <option value="configured">Configured</option>
              <option value="listening">Listening</option>
              <option value="paused">Paused</option>
              <option value="error">Error</option>
            </select>
          </label>
          <label className="config-toggle">
            <input checked={newController.is_enabled} onChange={(event) => setNewController((current) => ({ ...current, is_enabled: event.target.checked }))} type="checkbox" />
            <span>Enabled</span>
          </label>
        </div>
        <div className="config-actions">
          <button
            className="dashboard-apply-button"
            disabled={savingKey === "controller-new" || !newController.hostname.trim()}
            onClick={() =>
              void runAction(
                "controller-new",
                async () => {
                  const saved = await upsertDomainController({
                    hostname: newController.hostname.trim(),
                    name: newController.name.trim() || null,
                    event_fetch_interval_seconds: intValue(newController.event_fetch_interval_seconds, 300),
                    is_enabled: newController.is_enabled,
                    status: newController.status,
                  });
                  setControllers((current) =>
                    [...current.filter((item) => item.hostname !== saved.hostname), saved].sort((left, right) =>
                      left.name.localeCompare(right.name),
                    ),
                  );
                  setNewController({
                    hostname: "",
                    name: "",
                    event_fetch_interval_seconds: "300",
                    is_enabled: true,
                    status: "configured",
                  });
                },
                `Added controller ${newController.hostname.trim()}.`,
              )
            }
            type="button"
          >
            {savingKey === "controller-new" ? "Adding..." : "Add Domain Controller"}
          </button>
        </div>
      </SectionPanel>
    </ConfigurationShell>
  );
}

"use client";

import { useState } from "react";

import { SectionPanel } from "@/components/cards";
import { AlertRuleConfig, ConfigurationOverview, upsertAlertRule } from "@/lib/api";

import { ConfigurationShell } from "./config-shell";
import { PaginationFooter, usePagination } from "./paginated-table";

function intValue(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function AlertRulesWorkspace({ overview }: { overview: ConfigurationOverview }) {
  const [rules, setRules] = useState<AlertRuleConfig[]>(overview.alert_rules);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pagination = usePagination(rules, 10);

  function patchRule(id: number, patch: Partial<AlertRuleConfig>) {
    setRules((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  async function save(item: AlertRuleConfig) {
    setSavingKey(`rule-${item.id}`);
    setMessage(null);
    setError(null);
    try {
      const saved = await upsertAlertRule({
        key: item.key,
        display_name: item.display_name,
        description: item.description ?? null,
        severity: item.severity,
        threshold: item.threshold,
        window_minutes: item.window_minutes,
        channels: item.channels,
        is_enabled: item.is_enabled,
      });
      patchRule(item.id, saved);
      setMessage(`Updated alert rule ${item.display_name}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Update failed.");
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <ConfigurationShell
      overview={{ ...overview, alert_rules: rules }}
      subtitle="Tune operational alerting separately from policy and collector settings so threshold changes stay focused."
      title="Alert Rules"
    >
      {message ? <div className="banner">{message}</div> : null}
      {error ? <div className="banner banner-danger">{error}</div> : null}

      <SectionPanel kicker="Signal tuning" title="Alert Rules">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Rule</th>
                <th>Severity</th>
                <th>Threshold</th>
                <th>Window</th>
                <th>Enabled</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {pagination.pagedRows.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="table-title">{item.display_name}</div>
                    <div className="table-note">{item.description || item.key}</div>
                  </td>
                  <td>
                    <select className="table-input" value={item.severity} onChange={(event) => patchRule(item.id, { severity: event.target.value })}>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </td>
                  <td><input className="table-input table-input-small" max={100000} min={1} type="number" value={item.threshold} onChange={(event) => patchRule(item.id, { threshold: intValue(event.target.value, item.threshold) })} /></td>
                  <td><input className="table-input table-input-small" max={1440} min={1} type="number" value={item.window_minutes} onChange={(event) => patchRule(item.id, { window_minutes: intValue(event.target.value, item.window_minutes) })} /></td>
                  <td>
                    <label className="config-toggle config-toggle-inline">
                      <input checked={item.is_enabled} onChange={(event) => patchRule(item.id, { is_enabled: event.target.checked })} type="checkbox" />
                      <span>{item.is_enabled ? "Yes" : "No"}</span>
                    </label>
                  </td>
                  <td>
                    <button className="table-action" disabled={savingKey === `rule-${item.id}`} onClick={() => void save(item)} type="button">
                      {savingKey === `rule-${item.id}` ? "Saving..." : "Save"}
                    </button>
                  </td>
                </tr>
              ))}
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
    </ConfigurationShell>
  );
}

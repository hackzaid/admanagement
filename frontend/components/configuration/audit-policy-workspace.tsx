"use client";

import { useState } from "react";

import { SectionPanel } from "@/components/cards";
import { AuditPolicyExpectation, ConfigurationOverview, upsertAuditPolicyExpectation } from "@/lib/api";

import { ConfigurationShell } from "./config-shell";
import { PaginationFooter, usePagination } from "./paginated-table";

export function AuditPolicyWorkspace({ overview }: { overview: ConfigurationOverview }) {
  const [policies, setPolicies] = useState<AuditPolicyExpectation[]>(overview.audit_policy_expectations);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pagination = usePagination(policies, 10);

  function patchPolicy(id: number, patch: Partial<AuditPolicyExpectation>) {
    setPolicies((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  async function save(item: AuditPolicyExpectation) {
    setSavingKey(`policy-${item.id}`);
    setMessage(null);
    setError(null);
    try {
      const saved = await upsertAuditPolicyExpectation({
        id: item.id,
        policy_key: item.policy_key,
        display_name: item.display_name,
        category: item.category,
        required_state: item.required_state,
        rationale: item.rationale ?? null,
      });
      patchPolicy(item.id, saved);
      setMessage(`Updated audit policy ${item.display_name}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Update failed.");
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <ConfigurationShell
      overview={{ ...overview, audit_policy_expectations: policies }}
      subtitle="Set the audit-policy baseline the platform depends on so reporting gaps are explicit and reviewable."
      title="Audit Policy"
    >
      {message ? <div className="banner">{message}</div> : null}
      {error ? <div className="banner banner-danger">{error}</div> : null}

      <SectionPanel kicker="Logging prerequisites" title="Audit Policy Baseline">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Policy</th>
                <th>Required State</th>
                <th>Rationale</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {pagination.pagedRows.map((item) => (
                <tr key={item.id}>
                  <td>{item.display_name}</td>
                  <td>
                    <select className="table-input" value={item.required_state} onChange={(event) => patchPolicy(item.id, { required_state: event.target.value })}>
                      <option value="enabled">Enabled</option>
                      <option value="success">Success only</option>
                      <option value="failure">Failure only</option>
                      <option value="disabled">Disabled</option>
                    </select>
                  </td>
                  <td><input className="table-input" value={item.rationale ?? ""} onChange={(event) => patchPolicy(item.id, { rationale: event.target.value })} /></td>
                  <td>
                    <button className="table-action" disabled={savingKey === `policy-${item.id}`} onClick={() => void save(item)} type="button">
                      {savingKey === `policy-${item.id}` ? "Saving..." : "Save"}
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

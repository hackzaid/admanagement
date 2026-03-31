"use client";

import { useState } from "react";

import { SectionPanel } from "@/components/cards";
import { ConfigurationOverview, ExcludedAccountConfig, addExcludedAccount, removeExcludedAccount } from "@/lib/api";
import { formatPrincipalDisplay } from "@/lib/identity";

import { ConfigurationShell } from "./config-shell";
import { PaginationFooter, usePagination } from "./paginated-table";

export function ExcludedAccountsWorkspace({ overview }: { overview: ConfigurationOverview }) {
  const [accounts, setAccounts] = useState<ExcludedAccountConfig[]>(overview.excluded_accounts);
  const [newAccount, setNewAccount] = useState({
    principal_name: "",
    reason: "",
    is_enabled: true,
  });
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pagination = usePagination(accounts, 10);

  function patchAccount(id: number, patch: Partial<ExcludedAccountConfig>) {
    setAccounts((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
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
      overview={{ ...overview, excluded_accounts: accounts }}
      subtitle="Keep service-account and expected-noise suppressions isolated from collector and alert administration."
      title="Excluded Accounts"
    >
      {message ? <div className="banner">{message}</div> : null}
      {error ? <div className="banner banner-danger">{error}</div> : null}

      <SectionPanel kicker="Controlled suppression list" title="Excluded Accounts">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Principal</th>
                <th>Reason</th>
                <th>Enabled</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {pagination.pagedRows.length ? (
                pagination.pagedRows.map((item) => (
                  <tr key={item.id}>
                    <td>{formatPrincipalDisplay(item.principal_name)}</td>
                    <td><input className="table-input" value={item.reason ?? ""} onChange={(event) => patchAccount(item.id, { reason: event.target.value })} /></td>
                    <td>
                      <label className="config-toggle config-toggle-inline">
                        <input checked={item.is_enabled} onChange={(event) => patchAccount(item.id, { is_enabled: event.target.checked })} type="checkbox" />
                        <span>{item.is_enabled ? "Yes" : "No"}</span>
                      </label>
                    </td>
                    <td className="table-actions">
                      <button className="table-action" disabled={savingKey === `account-${item.id}`} onClick={() => void runAction(`account-${item.id}`, async () => {
                        const saved = await addExcludedAccount({
                          principal_name: item.principal_name,
                          reason: item.reason ?? null,
                          is_enabled: item.is_enabled,
                        });
                        patchAccount(item.id, saved);
                      }, `Updated excluded account ${formatPrincipalDisplay(item.principal_name)}.`)} type="button">
                        {savingKey === `account-${item.id}` ? "Saving..." : "Save"}
                      </button>
                      <button className="table-action table-action-danger" disabled={savingKey === `account-delete-${item.id}`} onClick={() => void runAction(`account-delete-${item.id}`, async () => {
                        await removeExcludedAccount(item.id);
                        setAccounts((current) => current.filter((row) => row.id !== item.id));
                      }, `Removed excluded account ${formatPrincipalDisplay(item.principal_name)}.`)} type="button">
                        {savingKey === `account-delete-${item.id}` ? "Removing..." : "Remove"}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={4}>No excluded accounts configured.</td></tr>
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

      <SectionPanel kicker="Add suppression" title="New Excluded Account">
        <div className="config-form-grid">
          <label className="config-field">
            <span>Principal</span>
            <input placeholder="svc-backup or DOMAIN\\svc-backup" value={newAccount.principal_name} onChange={(event) => setNewAccount((current) => ({ ...current, principal_name: event.target.value }))} />
          </label>
          <label className="config-field">
            <span>Reason</span>
            <input placeholder="Expected service account noise" value={newAccount.reason} onChange={(event) => setNewAccount((current) => ({ ...current, reason: event.target.value }))} />
          </label>
          <label className="config-toggle">
            <input checked={newAccount.is_enabled} onChange={(event) => setNewAccount((current) => ({ ...current, is_enabled: event.target.checked }))} type="checkbox" />
            <span>Enabled</span>
          </label>
        </div>
        <div className="config-actions">
          <button
            className="dashboard-apply-button"
            disabled={savingKey === "account-new" || !newAccount.principal_name.trim()}
            onClick={() =>
              void runAction(
                "account-new",
                async () => {
                  const saved = await addExcludedAccount({
                    principal_name: newAccount.principal_name.trim(),
                    reason: newAccount.reason.trim() || null,
                    is_enabled: newAccount.is_enabled,
                  });
                  setAccounts((current) =>
                    [...current.filter((item) => item.id !== saved.id), saved].sort((left, right) =>
                      left.principal_name.localeCompare(right.principal_name),
                    ),
                  );
                  setNewAccount({ principal_name: "", reason: "", is_enabled: true });
                },
                `Added excluded account ${formatPrincipalDisplay(newAccount.principal_name.trim())}.`,
              )
            }
            type="button"
          >
            {savingKey === "account-new" ? "Adding..." : "Add Excluded Account"}
          </button>
        </div>
      </SectionPanel>
    </ConfigurationShell>
  );
}

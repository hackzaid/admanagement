"use client";

import { useState } from "react";

import { SectionPanel } from "@/components/cards";
import { ConfigurationOverview, updateDomainSettings } from "@/lib/api";
import { formatDisplayDateTime } from "@/lib/datetime";

import { ConfigurationShell } from "./config-shell";

export function DomainSettingsWorkspace({ overview }: { overview: ConfigurationOverview }) {
  const [domain, setDomain] = useState(overview.domain);
  const [draft, setDraft] = useState({
    name: overview.domain.name,
    domain_fqdn: overview.domain.domain_fqdn,
    ldap_server: overview.domain.ldap_server ?? "",
    ldap_base_dn: overview.domain.ldap_base_dn ?? "",
    notes: overview.domain.notes ?? "",
    is_enabled: overview.domain.is_enabled,
    is_default: overview.domain.is_default,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const saved = await updateDomainSettings({
        ...draft,
        ldap_server: draft.ldap_server || null,
        ldap_base_dn: draft.ldap_base_dn || null,
        notes: draft.notes || null,
      });
      setDomain(saved);
      setDraft({
        name: saved.name,
        domain_fqdn: saved.domain_fqdn,
        ldap_server: saved.ldap_server ?? "",
        ldap_base_dn: saved.ldap_base_dn ?? "",
        notes: saved.notes ?? "",
        is_enabled: saved.is_enabled,
        is_default: saved.is_default,
      });
      setMessage("Domain settings updated.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Update failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ConfigurationShell
      overview={{ ...overview, domain }}
      subtitle="Set the primary directory identity, LDAP target, bind scope, and default-domain behavior."
      title="Domain Settings"
    >
      {message ? <div className="banner">{message}</div> : null}
      {error ? <div className="banner banner-danger">{error}</div> : null}

      <SectionPanel kicker="Primary monitored directory" title="Domain Settings">
        <div className="config-form-grid">
          <label className="config-field">
            <span>Name</span>
            <input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
          </label>
          <label className="config-field">
            <span>Domain FQDN</span>
            <input value={draft.domain_fqdn} onChange={(event) => setDraft((current) => ({ ...current, domain_fqdn: event.target.value }))} />
          </label>
          <label className="config-field">
            <span>LDAP Server</span>
            <input value={draft.ldap_server} onChange={(event) => setDraft((current) => ({ ...current, ldap_server: event.target.value }))} />
          </label>
          <label className="config-field">
            <span>Base DN</span>
            <input value={draft.ldap_base_dn} onChange={(event) => setDraft((current) => ({ ...current, ldap_base_dn: event.target.value }))} />
          </label>
          <label className="config-field config-field-full">
            <span>Notes</span>
            <textarea rows={4} value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} />
          </label>
          <label className="config-toggle">
            <input checked={draft.is_enabled} onChange={(event) => setDraft((current) => ({ ...current, is_enabled: event.target.checked }))} type="checkbox" />
            <span>Enabled</span>
          </label>
          <label className="config-toggle">
            <input checked={draft.is_default} onChange={(event) => setDraft((current) => ({ ...current, is_default: event.target.checked }))} type="checkbox" />
            <span>Default domain</span>
          </label>
        </div>
        <div className="config-actions">
          <button className="dashboard-apply-button" disabled={saving} onClick={() => void save()} type="button">
            {saving ? "Saving..." : "Save Domain Settings"}
          </button>
          <span className="config-meta">Updated {formatDisplayDateTime(domain.updated_at_utc, "No update recorded")}</span>
        </div>
      </SectionPanel>
    </ConfigurationShell>
  );
}

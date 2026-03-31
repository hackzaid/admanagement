"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { SetupStatus, bootstrapSetup, testSetupLdap, testSetupWinrm } from "@/lib/api";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function splitControllers(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function SetupWorkspace({ status }: { status: SetupStatus }) {
  const router = useRouter();
  const [form, setForm] = useState({
    domain_name: status.prefill.domain_name,
    domain_fqdn: status.prefill.domain_fqdn,
    ldap_server: status.prefill.ldap_server,
    ldap_base_dn: status.prefill.ldap_base_dn,
    ldap_bind_dn: status.prefill.ldap_bind_dn,
    ldap_bind_password: "",
    domain_controllers: status.prefill.domain_controllers.join("\n"),
    winrm_username: status.prefill.winrm_username,
    winrm_domain: status.prefill.winrm_domain,
    winrm_password: "",
    winrm_auth: status.prefill.winrm_auth,
    winrm_use_ssl: status.prefill.winrm_use_ssl,
    winrm_port: String(status.prefill.winrm_port),
    business_hours_timezone: status.prefill.business_hours_timezone,
    business_hours_start: String(status.prefill.business_hours_start),
    business_hours_end: String(status.prefill.business_hours_end),
    working_days: status.prefill.working_days,
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ldapTesting, setLdapTesting] = useState(false);
  const [winrmTesting, setWinrmTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  const domainControllers = useMemo(() => splitControllers(form.domain_controllers), [form.domain_controllers]);

  const patch = (key: keyof typeof form, value: string | boolean | string[]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const testLdap = async () => {
    setLdapTesting(true);
    setMessage(null);
    setError(null);
    try {
      const result = await testSetupLdap({
        ldap_server: form.ldap_server.trim(),
        ldap_bind_dn: form.ldap_bind_dn.trim(),
        ldap_bind_password: form.ldap_bind_password,
      });
      setMessage(`LDAP bind succeeded against ${result.server}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "LDAP test failed.");
    } finally {
      setLdapTesting(false);
    }
  };

  const testWinrm = async () => {
    if (!domainControllers.length) {
      setError("Add at least one domain controller before testing WinRM.");
      return;
    }
    setWinrmTesting(true);
    setMessage(null);
    setError(null);
    try {
      const result = await testSetupWinrm({
        hostname: domainControllers[0],
        winrm_username: form.winrm_username.trim(),
        winrm_domain: form.winrm_domain.trim(),
        winrm_password: form.winrm_password,
        winrm_auth: form.winrm_auth,
        winrm_use_ssl: form.winrm_use_ssl,
        winrm_port: Number.parseInt(form.winrm_port, 10) || 5986,
      });
      setMessage(`WinRM responded from ${result.computer_name || result.hostname}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "WinRM test failed.");
    } finally {
      setWinrmTesting(false);
    }
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      await bootstrapSetup({
        domain_name: form.domain_name.trim(),
        domain_fqdn: form.domain_fqdn.trim(),
        ldap_server: form.ldap_server.trim(),
        ldap_base_dn: form.ldap_base_dn.trim(),
        ldap_bind_dn: form.ldap_bind_dn.trim(),
        ldap_bind_password: form.ldap_bind_password,
        domain_controllers: domainControllers,
        winrm_username: form.winrm_username.trim(),
        winrm_domain: form.winrm_domain.trim(),
        winrm_password: form.winrm_password,
        winrm_auth: form.winrm_auth,
        winrm_use_ssl: form.winrm_use_ssl,
        winrm_port: Number.parseInt(form.winrm_port, 10) || 5986,
        business_hours_timezone: form.business_hours_timezone.trim(),
        business_hours_start: Number.parseInt(form.business_hours_start, 10) || 8,
        business_hours_end: Number.parseInt(form.business_hours_end, 10) || 18,
        working_days: form.working_days,
      });
      router.push("/");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Setup failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="onboarding-shell">
      <section className="onboarding-hero">
        <div>
          <div className="eyebrow">Deployment Onboarding</div>
          <h1>Initialize the directory monitoring console</h1>
          <p>Set the monitored domain, bind credentials, domain controllers, and first-run operational window before handing the console to admins.</p>
        </div>
        <div className="onboarding-checks">
          <div className={`onboarding-check${status.checks.has_domain ? " onboarding-check-pass" : ""}`}>Domain profile</div>
          <div className={`onboarding-check${status.checks.has_ldap_credentials ? " onboarding-check-pass" : ""}`}>LDAP access</div>
          <div className={`onboarding-check${status.checks.has_winrm_credentials ? " onboarding-check-pass" : ""}`}>WinRM access</div>
          <div className={`onboarding-check${status.checks.has_domain_controllers ? " onboarding-check-pass" : ""}`}>Collector targets</div>
        </div>
      </section>

      {message ? <div className="banner">{message}</div> : null}
      {error ? <div className="banner banner-danger">{error}</div> : null}

      <section className="onboarding-grid">
        <article className="panel onboarding-card">
          <div className="section-kicker">Step 1</div>
          <h2>Directory identity</h2>
          <div className="config-form-grid">
            <label className="config-field">
              <span>Environment Name</span>
              <input value={form.domain_name} onChange={(event) => patch("domain_name", event.target.value)} />
            </label>
            <label className="config-field">
              <span>Domain FQDN</span>
              <input value={form.domain_fqdn} onChange={(event) => patch("domain_fqdn", event.target.value)} />
            </label>
            <label className="config-field">
              <span>LDAP Server</span>
              <input value={form.ldap_server} onChange={(event) => patch("ldap_server", event.target.value)} />
            </label>
            <label className="config-field">
              <span>Base DN</span>
              <input value={form.ldap_base_dn} onChange={(event) => patch("ldap_base_dn", event.target.value)} />
            </label>
          </div>
        </article>

        <article className="panel onboarding-card">
          <div className="section-kicker">Step 2</div>
          <h2>Access credentials</h2>
          <div className="config-form-grid">
            <label className="config-field config-field-full">
              <span>LDAP Bind DN</span>
              <input value={form.ldap_bind_dn} onChange={(event) => patch("ldap_bind_dn", event.target.value)} />
            </label>
            <label className="config-field config-field-full">
              <span>LDAP Bind Password</span>
              <input type="password" value={form.ldap_bind_password} onChange={(event) => patch("ldap_bind_password", event.target.value)} />
            </label>
            <label className="config-field">
              <span>WinRM Username</span>
              <input value={form.winrm_username} onChange={(event) => patch("winrm_username", event.target.value)} />
            </label>
            <label className="config-field">
              <span>WinRM Domain</span>
              <input value={form.winrm_domain} onChange={(event) => patch("winrm_domain", event.target.value)} />
            </label>
            <label className="config-field">
              <span>WinRM Password</span>
              <input type="password" value={form.winrm_password} onChange={(event) => patch("winrm_password", event.target.value)} />
            </label>
            <label className="config-field">
              <span>WinRM Auth</span>
              <select className="table-input" value={form.winrm_auth} onChange={(event) => patch("winrm_auth", event.target.value)}>
                <option value="ntlm">NTLM</option>
                <option value="credssp">CredSSP</option>
                <option value="kerberos">Kerberos</option>
              </select>
            </label>
            <label className="config-field">
              <span>WinRM Port</span>
              <input type="number" value={form.winrm_port} onChange={(event) => patch("winrm_port", event.target.value)} />
            </label>
            <label className="config-toggle">
              <input checked={form.winrm_use_ssl} onChange={(event) => patch("winrm_use_ssl", event.target.checked)} type="checkbox" />
              <span>Use SSL</span>
            </label>
          </div>
          <div className="config-actions">
            <button className="dashboard-apply-button" disabled={ldapTesting} onClick={() => void testLdap()} type="button">
              {ldapTesting ? "Testing LDAP..." : "Test LDAP"}
            </button>
            <button className="dashboard-apply-button" disabled={winrmTesting} onClick={() => void testWinrm()} type="button">
              {winrmTesting ? "Testing WinRM..." : "Test WinRM"}
            </button>
          </div>
        </article>

        <article className="panel onboarding-card onboarding-card-wide">
          <div className="section-kicker">Step 3</div>
          <h2>Collector targets and working window</h2>
          <div className="config-form-grid">
            <label className="config-field config-field-full">
              <span>Domain Controllers</span>
              <textarea
                rows={5}
                value={form.domain_controllers}
                onChange={(event) => patch("domain_controllers", event.target.value)}
                placeholder={"dc01.example.local\ndc02.example.local"}
              />
            </label>
            <label className="config-field">
              <span>Business Hours Timezone</span>
              <input value={form.business_hours_timezone} onChange={(event) => patch("business_hours_timezone", event.target.value)} />
            </label>
            <label className="config-field">
              <span>Start Hour</span>
              <input type="number" min={0} max={23} value={form.business_hours_start} onChange={(event) => patch("business_hours_start", event.target.value)} />
            </label>
            <label className="config-field">
              <span>End Hour</span>
              <input type="number" min={0} max={23} value={form.business_hours_end} onChange={(event) => patch("business_hours_end", event.target.value)} />
            </label>
            <div className="config-field config-field-full">
              <span>Working Days</span>
              <div className="config-checkbox-grid">
                {WEEKDAYS.map((day) => (
                  <label className="config-toggle" key={day}>
                    <input
                      checked={form.working_days.includes(day)}
                      onChange={(event) =>
                        patch(
                          "working_days",
                          event.target.checked
                            ? [...form.working_days, day]
                            : form.working_days.filter((item) => item !== day),
                        )
                      }
                      type="checkbox"
                    />
                    <span>{day}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </article>
      </section>

      <section className="onboarding-actions">
        <div className="stack-subtle">This saves runtime connection settings, seeds the default domain, and enables first-run configuration through the console.</div>
        <button className="dashboard-apply-button" disabled={saving} onClick={() => void save()} type="button">
          {saving ? "Initializing..." : "Finish Setup"}
        </button>
      </section>
    </main>
  );
}

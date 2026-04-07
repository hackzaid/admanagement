"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { loginWithAd } from "@/lib/api";

function setSessionCookie(token: string) {
  document.cookie = `admanagement_session=${encodeURIComponent(token)}; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 12}`;
}

export function LoginWorkspace() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      const session = await loginWithAd({ username, password });
      setSessionCookie(session.token);
      router.push("/");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-backdrop">
        <div className="login-grid-glow" />
        <div className="login-orb login-orb-primary" />
        <div className="login-orb login-orb-secondary" />
        <div className="login-orb login-orb-tertiary" />
      </div>

      <main className="login-viewport">
        <div className="login-frame panel">
          <section className="login-visual">
            <div className="login-visual-copy">
              <div className="brand-mark">
                <div className="brand-ring" />
                <div>
                  <div className="brand-title">AD Management</div>
                  <div className="brand-subtitle">Directory Audit Console</div>
                </div>
              </div>

              <div className="login-visual-kicker">Directory Operations</div>
              <h1 className="login-visual-title">
                Stay ahead of privileged change, stale identity risk, and noisy authentication failures.
              </h1>
              <p className="login-visual-text">
                Built for everyday administrators who need one clear surface for Active Directory activity, compliance drift,
                and source-aware access monitoring.
              </p>
            </div>

            <div className="login-scene">
              <div className="login-scene-panel login-scene-panel-primary">
                <div className="login-scene-label">Signal</div>
                <strong>Authentication + Change Intelligence</strong>
                <span>
                  Track failed logons, RDP origin, stale objects, and administrative change concentration.
                </span>
              </div>

              <div className="login-scene-panel login-scene-panel-secondary">
                <div className="login-scene-stat">
                  <span>Source-aware</span>
                  <strong>IP + workstation attribution</strong>
                </div>
                <div className="login-scene-stat">
                  <span>Operational</span>
                  <strong>Built for live AD environments</strong>
                </div>
              </div>

              <div className="login-scene-grid">
                <div className="login-scene-card">
                  <span className="login-scene-card-label">Failed Logons</span>
                  <strong>Pivot by source IP</strong>
                </div>
                <div className="login-scene-card">
                  <span className="login-scene-card-label">RDP Evidence</span>
                  <strong>Track recorded hosts</strong>
                </div>
                <div className="login-scene-card">
                  <span className="login-scene-card-label">Directory Drift</span>
                  <strong>Stale and risky accounts</strong>
                </div>
              </div>
            </div>
          </section>

          <section className="login-card">
            <header className="login-branding">
              <div className="eyebrow">Identity Awareness</div>
              <h2 className="login-form-title">Sign In</h2>
              <p className="login-form-copy">
                Use your AD username and password to access the operational console.
              </p>
            </header>

            <form
              className="login-form"
              onSubmit={(event) => {
                event.preventDefault();
                void submit();
              }}
            >
              {error ? <div className="banner banner-danger login-alert">{error}</div> : null}

              <div className="login-fields">
                <label className="config-field">
                  <span>Username</span>
                  <input
                    autoFocus
                    autoComplete="username"
                    placeholder="degesa"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                  />
                </label>
                <label className="config-field">
                  <span>Password</span>
                  <input
                    autoComplete="current-password"
                    placeholder="********"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </label>
              </div>

              <button className="dashboard-apply-button login-submit" disabled={loading || !username.trim() || !password} type="submit">
                {loading ? "Authenticating..." : "Sign In to Console"}
              </button>
            </form>

            <footer className="login-footer">
              <div className="config-meta">Protected Information System | Session Audit Active</div>
              <div className="login-footer-note">Slate console theme | AD-backed access</div>
            </footer>
          </section>
        </div>
      </main>
    </div>
  );
}

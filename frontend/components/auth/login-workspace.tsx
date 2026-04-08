"use client";

import Image from "next/image";
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
      <main className="login-viewport">
        <div className="login-frame">
          <section className="login-card">
            <header className="login-branding">
              <div className="login-brand-row">
                <div className="brand-mark login-brand-mark">
                  <div className="brand-ring" />
                  <div>
                    <div className="brand-title">AD Management</div>
                    <div className="brand-subtitle">Directory Audit Console</div>
                  </div>
                </div>
              </div>

              <h2 className="login-form-title">Sign in</h2>
              <p className="login-form-copy">
                Access the console with your Active Directory username and password.
              </p>
              <p className="login-support-copy">
                Authorized administrators only. Username only, for example <strong>degesa</strong>.
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

              <div className="login-remember-row">
                <label className="login-check">
                  <input type="checkbox" defaultChecked />
                  <span>Remember this device</span>
                </label>
                <span className="login-inline-note">Session audit active</span>
              </div>

              <button className="login-submit" disabled={loading || !username.trim() || !password} type="submit">
                {loading ? "Authenticating..." : "Sign in"}
              </button>

              <div className="login-divider">
                <span>Directory-backed access</span>
              </div>

              <div className="login-meta-list">
                <div className="login-meta-item">
                  <span>Auth source</span>
                  <strong>Active Directory</strong>
                </div>
                <div className="login-meta-item">
                  <span>Use case</span>
                  <strong>Operations and audit</strong>
                </div>
              </div>
            </form>

            <footer className="login-footer">
              <div className="config-meta">Protected operational system</div>
              <div className="login-footer-note">All access is validated against your current directory credentials.</div>
            </footer>
          </section>

          <section className="login-visual">
            <div className="login-photo-frame">
              <Image
                alt="Professional working on a laptop in a modern office"
                className="login-photo"
                fill
                priority
                sizes="(max-width: 1120px) 100vw, 58vw"
                src="/login-hero.jpg"
              />
              <div className="login-photo-overlay" />
              <div className="login-visual-copy">
                <div className="login-visual-kicker">Live directory operations</div>
                <h1 className="login-visual-title">
                  One trusted surface for AD access evidence, change intelligence, and risk posture.
                </h1>
                <p className="login-visual-text">
                  Track failed logons, privileged changes, stale identity drift, and RDP evidence from the systems that matter.
                </p>
              </div>

              <div className="login-floating-card login-floating-card-primary">
                <span className="login-floating-label">Recorded hosts</span>
                <strong>RDP + logon source visibility</strong>
              </div>

              <div className="login-floating-card login-floating-card-secondary">
                <span className="login-floating-label">Operational focus</span>
                <strong>Built for everyday AD administrators</strong>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

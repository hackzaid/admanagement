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
        <div className="login-orb login-orb-primary" />
        <div className="login-orb login-orb-secondary" />
      </div>

      <main className="login-viewport">
        <div className="login-card panel">
          <header className="login-branding">
            <div className="brand-mark">
              <div className="brand-ring" />
              <div>
                <div className="brand-title">AD Management</div>
                <div className="brand-subtitle">Directory Audit Console</div>
              </div>
            </div>
          </header>

          <section className="login-intro">
            <div className="eyebrow">Identity Awareness</div>
            <h1>Sign In</h1>
            <p>Access the unified operational plane for Active Directory administrative auditing and compliance reporting.</p>
          </section>

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
                  placeholder="Operator username"
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
          </footer>
        </div>
      </main>
    </div>
  );
}

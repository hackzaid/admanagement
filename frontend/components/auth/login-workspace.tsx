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
    <main className="login-shell">
      <section className="panel login-card">
        <div className="eyebrow">Active Directory Login</div>
        <h1>Sign in to AD Management</h1>
        <p>Use your AD username and password. Enter the username only, for example <strong>degesa</strong>.</p>

        {error ? <div className="banner banner-danger">{error}</div> : null}

        <div className="config-form-grid">
          <label className="config-field config-field-full">
            <span>Username</span>
            <input autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} />
          </label>
          <label className="config-field config-field-full">
            <span>Password</span>
            <input
              autoComplete="current-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
        </div>

        <div className="config-actions">
          <button className="dashboard-apply-button" disabled={loading || !username.trim() || !password} onClick={() => void submit()} type="button">
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </div>
      </section>
    </main>
  );
}

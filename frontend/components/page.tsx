"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { loginAuthSession } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Ensure the system theme is active on the login page context
    document.documentElement.dataset.theme = "slate";
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Attempt to establish a session via the backend API
      await loginAuthSession({ username, password });
      router.push("/");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Authentication failed. Please verify your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen">
      {/* Ambient decorative elements to add visual depth */}
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

          <form className="login-form" onSubmit={handleSubmit}>
            {error ? (
              <div className="banner banner-danger login-alert">
                {error}
              </div>
            ) : null}

            <div className="login-fields">
              <label className="config-field">
                <span>Username</span>
                <input
                  autoFocus
                  required
                  placeholder="Operator username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </label>
              <label className="config-field">
                <span>Password</span>
                <input
                  required
                  placeholder="••••••••"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
            </div>

            <button className="dashboard-apply-button login-submit" disabled={loading} type="submit">
              {loading ? "Authenticating..." : "Sign In to Console"}
            </button>
          </form>

          <footer className="login-footer">
            <div className="config-meta">Protected Information System • Session Audit Active</div>
          </footer>
        </div>
      </main>
    </div>
  );
}
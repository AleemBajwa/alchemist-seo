"use client";

import { useState, useEffect } from "react";
import { Loader2, Check, Key } from "lucide-react";

export default function SettingsPage() {
  const [dataforseoLogin, setDataforseoLogin] = useState("");
  const [dataforseoPassword, setDataforseoPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings/keys")
      .then((r) => r.json())
      .then((d) => {
        // We don't return actual credentials for security
        if (d.keys?.find((k: { provider: string }) => k.provider === "dataforseo")?.hasCredentials) {
          setDataforseoLogin("__configured__");
          setDataforseoPassword("__configured__");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/settings/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "dataforseo",
          login: dataforseoLogin === "__configured__" ? undefined : dataforseoLogin || undefined,
          password: dataforseoPassword === "__configured__" ? undefined : dataforseoPassword || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSaved(true);
        if (dataforseoLogin && dataforseoLogin !== "__configured__") {
          setDataforseoLogin("__configured__");
          setDataforseoPassword("__configured__");
        }
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-100">
          Settings
        </h1>
        <p className="mt-1 text-zinc-500">
          API keys and integrations. Your keys are stored securely.
        </p>
      </div>

      <div className="max-w-2xl space-y-6">
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-orange-500/10 p-2">
              <Key className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <h2 className="font-semibold text-zinc-100">DataForSEO</h2>
              <p className="text-sm text-zinc-500">
                Real keyword data.{" "}
                <a
                  href="https://dataforseo.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--accent)] hover:underline"
                >
                  Sign up free
                </a>
              </p>
            </div>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm text-zinc-500">Login</label>
              <input
                type="text"
                value={dataforseoLogin === "__configured__" ? "" : dataforseoLogin}
                onChange={(e) => setDataforseoLogin(e.target.value)}
                placeholder={dataforseoLogin === "__configured__" ? "Configured (enter new to change)" : "your@email.com"}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-zinc-900 px-4 py-2 text-zinc-100 placeholder:text-zinc-600"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-500">Password</label>
              <input
                type="password"
                value={dataforseoPassword === "__configured__" ? "" : dataforseoPassword}
                onChange={(e) => setDataforseoPassword(e.target.value)}
                placeholder={dataforseoPassword === "__configured__" ? "Configured (enter new to change)" : "••••••••"}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-zinc-900 px-4 py-2 text-zinc-100 placeholder:text-zinc-600"
                disabled={loading}
              />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <button
              type="submit"
              disabled={saving || loading}
              className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 font-medium text-white hover:bg-[var(--accent-muted)] disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : saved ? (
                <Check className="h-4 w-4" />
              ) : null}
              {saving ? "Saving..." : saved ? "Saved" : "Save"}
            </button>
            {saved && (
              <span className="text-sm text-emerald-500">Credentials saved</span>
            )}
          </div>
        </form>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
          <h3 className="font-semibold text-zinc-100">Database</h3>
          <p className="mt-1 text-sm text-zinc-500">
            Using SQLite (file: ./dev.db). Run{" "}
            <code className="rounded bg-zinc-800 px-1 py-0.5">npx prisma migrate dev</code>{" "}
            to set up.
          </p>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
          <h3 className="font-semibold text-zinc-100">Need help?</h3>
          <p className="mt-1 text-sm text-zinc-500">
            Visit <a href="/setup" className="text-[var(--accent)] hover:underline">/setup</a> for
            setup instructions.
          </p>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Loader2, Check, Palette, Crown, Zap, Key, Copy, Trash2 } from "lucide-react";

export default function SettingsPage() {
  const [dataforseoConfigured, setDataforseoConfigured] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("");
  const [loading, setLoading] = useState(true);
  const [wlSaving, setWlSaving] = useState(false);
  const [wlSaved, setWlSaved] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [apiKeys, setApiKeys] = useState<Array<{ id: string; name: string; keyPrefix: string; lastUsedAt: string | null; createdAt: string }>>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [apiKeyLoading, setApiKeyLoading] = useState(false);
  const [createdKeyRaw, setCreatedKeyRaw] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/settings/keys").then((r) => r.json()),
      fetch("/api/settings/whitelabel").then((r) => r.json()),
      fetch("/api/billing/status").then((r) => r.json()),
      fetch("/api/settings/api-keys").then((r) => r.json()),
    ]).then(([keysData, wlData, billingData, apiKeysData]) => {
      const configured = !!keysData.keys?.find((k: { provider: string }) => k.provider === "dataforseo")?.hasCredentials;
      setDataforseoConfigured(configured);
      if (wlData.whiteLabel) {
        setCompanyName(wlData.whiteLabel.companyName || "");
        setLogoUrl(wlData.whiteLabel.logoUrl || "");
        setPrimaryColor(wlData.whiteLabel.primaryColor || "");
      }
      setIsPremium(!!billingData?.isPremium);
      if (apiKeysData?.keys) setApiKeys(apiKeysData.keys);
    }).finally(() => setLoading(false));
  }, []);

  async function handleCreateApiKey(e: React.FormEvent) {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    setApiKeyLoading(true);
    setCreatedKeyRaw(null);
    try {
      const res = await fetch("/api/settings/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName.trim() }),
      });
      const data = await res.json();
      if (data.success && data.key) {
        setCreatedKeyRaw(data.key.raw);
        setApiKeys((prev) => [
          { id: data.key.id, name: data.key.name, keyPrefix: data.key.keyPrefix, lastUsedAt: null, createdAt: data.key.createdAt },
          ...prev,
        ]);
        setNewKeyName("");
      }
    } finally {
      setApiKeyLoading(false);
    }
  }

  async function handleRevokeApiKey(id: string) {
    if (!confirm("Revoke this API key? It will stop working immediately.")) return;
    try {
      await fetch(`/api/settings/api-keys/${id}`, { method: "DELETE" });
      setApiKeys((prev) => prev.filter((k) => k.id !== id));
      setCreatedKeyRaw(null);
    } catch {}
  }

  async function handleWhiteLabelSubmit(e: React.FormEvent) {
    e.preventDefault();
    setWlSaving(true);
    setWlSaved(false);
    try {
      const res = await fetch("/api/settings/whitelabel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: companyName || undefined,
          logoUrl: logoUrl || undefined,
          primaryColor: primaryColor || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setWlSaved(true);
      }
    } finally {
      setWlSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="hero-shell p-5 md:p-6">
        <span className="hero-kicker">Control Center</span>
        <h1 className="hero-title mt-3">Settings</h1>
        <p className="mt-2 max-w-3xl text-[1rem] text-zinc-600">
          Configure credentials, subscriptions, and brand identity with a streamlined setup flow.
        </p>
      </div>

      <div className="max-w-4xl space-y-4">
        <div className="panel p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[var(--accent)]/15 p-2.5">
              <Crown className="h-5 w-5 text-[var(--accent-muted)]" />
            </div>
            <div>
              <h2 className="font-heading text-lg font-semibold text-foreground">Subscription</h2>
              <p className="text-sm text-zinc-500">
                {isPremium
                  ? "Active subscription. Manage billing details below."
                  : "Enable paid plans for subscribers with Stripe checkout."}
              </p>
            </div>
          </div>
          <div className="mt-4">
            {isPremium ? (
              <button
                onClick={async () => {
                  setPortalLoading(true);
                  try {
                    const r = await fetch("/api/billing/portal", { method: "POST" });
                    const d = await r.json();
                    if (d.url) window.location.href = d.url;
                  } finally {
                    setPortalLoading(false);
                  }
                }}
                disabled={portalLoading}
                className="btn-secondary flex items-center gap-2 disabled:opacity-50"
              >
                {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Manage subscription
              </button>
            ) : (
              <button
                onClick={async () => {
                  setPortalLoading(true);
                  try {
                    const r = await fetch("/api/billing/checkout", { method: "POST" });
                    const d = await r.json();
                    if (d.url) window.location.href = d.url;
                  } finally {
                    setPortalLoading(false);
                  }
                }}
                disabled={portalLoading}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                Upgrade to Premium
              </button>
            )}
          </div>
        </div>

        <div className="panel p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-violet-500/10 p-2.5">
              <Key className="h-5 w-5 text-violet-500" />
            </div>
            <div>
              <h2 className="font-heading text-lg font-semibold text-foreground">API Access</h2>
              <p className="text-sm text-zinc-500">
                Create API keys to access domain data (overview, organic, backlinks, gap) from third-party apps.
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            <form onSubmit={handleCreateApiKey} className="flex gap-2">
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="Key name (e.g. My App)"
                className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={apiKeyLoading || loading}
                className="btn-primary flex items-center gap-2 px-4 disabled:opacity-50"
              >
                {apiKeyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
                Create key
              </button>
            </form>
            {createdKeyRaw && (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
                <p className="font-medium">API key created. Copy it now – it won&apos;t be shown again:</p>
                <div className="mt-2 flex items-center gap-2">
                  <code className="flex-1 break-all rounded-lg bg-black/30 px-2 py-1 font-mono text-xs">{createdKeyRaw}</code>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(createdKeyRaw);
                    }}
                    className="flex items-center gap-1 rounded-lg border border-amber-500/40 px-2 py-1 text-xs hover:bg-amber-500/20"
                  >
                    <Copy className="h-3.5 w-3.5" /> Copy
                  </button>
                </div>
                <p className="mt-2 text-xs text-amber-300/90">
                  Use header <code className="rounded bg-black/30 px-1">X-API-Key: your_key</code> or <code className="rounded bg-black/30 px-1">Authorization: Bearer your_key</code>
                </p>
              </div>
            )}
            {apiKeys.length > 0 && (
              <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--card)]/80 p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Your keys</p>
                <ul className="space-y-2">
                  {apiKeys.map((k) => (
                    <li key={k.id} className="flex items-center justify-between rounded-lg bg-[#120b28] px-3 py-2 text-sm">
                      <div>
                        <span className="font-medium text-foreground">{k.name}</span>
                        <span className="ml-2 font-mono text-zinc-500">{k.keyPrefix}…</span>
                        {k.lastUsedAt && (
                          <span className="ml-2 text-xs text-zinc-600">Last used: {new Date(k.lastUsedAt).toLocaleDateString()}</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRevokeApiKey(k.id)}
                        className="rounded p-1.5 text-zinc-500 hover:bg-red-500/20 hover:text-red-400"
                        aria-label="Revoke key"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="panel p-5">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="font-heading text-lg font-semibold text-foreground">DataForSEO Service</h2>
              <p className="text-sm text-zinc-500">
                Managed by the account owner via server environment variables.
              </p>
            </div>
          </div>
          <div className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--card)]/80 p-4">
            <p className="text-sm text-zinc-500">Status</p>
            <p className={`mt-1 text-sm font-medium ${dataforseoConfigured ? "text-emerald-400" : "text-amber-300"}`}>
              {dataforseoConfigured
                ? "Configured by owner. Keyword and position data are available."
                : "Not configured on server yet. Contact the account owner."}
            </p>
          </div>
        </div>

        <form
          onSubmit={handleWhiteLabelSubmit}
          className="panel p-5"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-violet-500/10 p-2">
              <Palette className="h-5 w-5 text-violet-500" />
            </div>
            <div>
              <h2 className="font-heading text-lg font-semibold text-foreground">White Label</h2>
              <p className="text-sm text-zinc-500">
                Brand PDF reports with your company name and logo
              </p>
            </div>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm text-zinc-500">Company name</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Your Agency Name"
                className="mt-1 w-full"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-500">Logo URL</label>
              <input
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
                className="mt-1 w-full"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-500">Primary color (hex)</label>
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                placeholder="#f97316"
                className="mt-1 w-full"
                disabled={loading}
              />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <button
              type="submit"
              disabled={wlSaving || loading}
              className="btn-primary flex items-center gap-2 disabled:opacity-50"
            >
              {wlSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : wlSaved ? (
                <Check className="h-4 w-4" />
              ) : null}
              {wlSaving ? "Saving..." : wlSaved ? "Saved" : "Save"}
            </button>
            {wlSaved && (
              <span className="text-sm text-emerald-500">White label saved</span>
            )}
          </div>
        </form>

        <div className="panel p-5">
          <h3 className="font-heading text-lg font-semibold text-foreground">Database</h3>
          <p className="mt-1 text-sm text-zinc-500">
            Using SQLite (file: ./dev.db). Run{" "}
            <code className="rounded-lg bg-zinc-100 px-1.5 py-0.5 text-sm">npx prisma migrate dev</code>{" "}
            to set up.
          </p>
        </div>

        <div className="panel p-5">
          <h3 className="font-heading text-lg font-semibold text-foreground">Need help?</h3>
          <p className="mt-1 text-sm text-zinc-500">
            Visit <a href="/setup" className="text-[var(--accent)] hover:underline">/setup</a> for
            setup instructions.
          </p>
        </div>
      </div>
    </div>
  );
}

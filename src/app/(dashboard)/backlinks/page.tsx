"use client";

import { useState } from "react";
import { Link2, Loader2, ExternalLink } from "lucide-react";

export default function BacklinksPage() {
  const [target, setTarget] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    backlinks: number;
    referringDomains: number;
    referringMainDomains: number;
    items: { url: string; target: string; pageTitle: string }[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!target.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/backlinks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: target.trim(), limit: 30 }),
      });
      const data = await res.json();

      if (!data.success) {
        if (data.error === "API_KEYS_REQUIRED") {
          setError("Add your DataForSEO credentials in Settings.");
        } else {
          setError(data.message || "Failed to fetch backlinks");
        }
        return;
      }
      setResult(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-100">
          Backlinks
        </h1>
        <p className="mt-1 text-zinc-500">
          Analyze backlink profile for any domain. Requires DataForSEO.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-4">
        <div className="relative flex-1">
          <Link2 className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="example.com or https://example.com"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] py-3 pl-12 pr-4 text-zinc-100 placeholder:text-zinc-600 focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            disabled={loading}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-6 py-3 font-medium text-white transition-colors hover:bg-[var(--accent-muted)] disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Link2 className="h-5 w-5" />
              Analyze
            </>
          )}
        </button>
      </form>

      {error && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-amber-400">
          {error}
          {error.includes("Settings") && (
            <a href="/settings" className="ml-2 underline">Go to Settings</a>
          )}
        </div>
      )}

      {result && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
              <p className="text-sm text-zinc-500">Backlinks</p>
              <p className="mt-1 text-2xl font-bold text-zinc-100">
                {result.backlinks.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
              <p className="text-sm text-zinc-500">Referring Domains</p>
              <p className="mt-1 text-2xl font-bold text-zinc-100">
                {result.referringDomains.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
              <p className="text-sm text-zinc-500">Referring Main Domains</p>
              <p className="mt-1 text-2xl font-bold text-zinc-100">
                {result.referringMainDomains.toLocaleString()}
              </p>
            </div>
          </div>

          {result.items.length > 0 && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
              <h3 className="border-b border-[var(--border)] px-6 py-4 font-semibold text-zinc-100">
                Sample Backlinks
              </h3>
              <div className="divide-y divide-[var(--border)]">
                {result.items.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-white/5"
                  >
                    <div className="min-w-0 flex-1">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--accent)] hover:underline truncate block"
                      >
                        {item.url}
                      </a>
                      {item.pageTitle && (
                        <p className="mt-1 text-sm text-zinc-500 truncate">
                          {item.pageTitle}
                        </p>
                      )}
                    </div>
                    <ExternalLink className="h-4 w-4 shrink-0 text-zinc-500" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

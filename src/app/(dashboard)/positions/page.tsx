"use client";

import { useState } from "react";
import { BarChart3, Loader2, TrendingUp } from "lucide-react";

export default function PositionsPage() {
  const [keyword, setKeyword] = useState("");
  const [target, setTarget] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    keyword: string;
    target: string;
    position: number | null;
    url: string | null;
    results: { position: number; url: string; title: string; domain: string; isTarget: boolean }[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!keyword.trim() || !target.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/positions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: keyword.trim(),
          target: target.trim(),
        }),
      });
      const data = await res.json();

      if (!data.success) {
        if (data.error === "API_KEYS_REQUIRED") {
          setError("Add your DataForSEO credentials in Settings.");
        } else {
          setError(data.message || "Failed to check position");
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
          Position Tracking
        </h1>
        <p className="mt-1 text-zinc-500">
          Check where your site ranks for a keyword. Requires DataForSEO.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm text-zinc-500 mb-1">Keyword</label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="e.g. best seo tools"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] py-3 px-4 text-zinc-100 placeholder:text-zinc-600"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-500 mb-1">Your domain</label>
            <input
              type="text"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="example.com"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] py-3 px-4 text-zinc-100 placeholder:text-zinc-600"
              disabled={loading}
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-6 py-3 font-medium text-white hover:bg-[var(--accent-muted)] disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <BarChart3 className="h-5 w-5" />
              Check Position
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
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
            <h3 className="text-lg font-semibold text-zinc-100">Results</h3>
            <div className="mt-4 flex items-center gap-4">
              <span className="text-zinc-500">Keyword:</span>
              <span className="font-medium text-zinc-100">{result.keyword}</span>
              <span className="text-zinc-500">|</span>
              <span className="text-zinc-500">Domain:</span>
              <span className="font-medium text-zinc-100">{result.target}</span>
              <span className="text-zinc-500">|</span>
              <span className="text-zinc-500">Position:</span>
              <span className="font-bold text-[var(--accent)]">
                {result.position ?? "Not in top 100"}
              </span>
            </div>
          </div>

          {result.results.length > 0 && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
              <h3 className="border-b border-[var(--border)] px-6 py-4 font-semibold text-zinc-100">
                SERP Results (top 100)
              </h3>
              <div className="divide-y divide-[var(--border)] max-h-[500px] overflow-y-auto">
                {result.results.map((item, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-4 px-6 py-3 ${item.isTarget ? "bg-[var(--accent)]/10" : ""}`}
                  >
                    <span className="w-8 text-sm font-medium text-zinc-500">
                      #{item.position}
                    </span>
                    {item.isTarget && (
                      <TrendingUp className="h-4 w-4 text-[var(--accent)] shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`truncate block ${item.isTarget ? "text-[var(--accent)] font-medium" : "text-zinc-300 hover:text-zinc-100"}`}
                      >
                        {item.title || item.url}
                      </a>
                      <p className="text-sm text-zinc-600 truncate">{item.domain}</p>
                    </div>
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

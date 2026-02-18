"use client";

import { useState, useEffect } from "react";
import {
  Loader2,
  GitCompare,
  TrendingUp,
  BarChart3,
  Sparkles,
} from "lucide-react";

type GapRow = {
  keyword: string;
  position1: number | null;
  position2: number | null;
  searchVolume: number | null;
  cpc: number | null;
  competition: number | null;
  etv: number | null;
};

export default function KeywordGapPage() {
  const [target1, setTarget1] = useState("");
  const [target2, setTarget2] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    domain1: string;
    domain2: string;
    keywords: GapRow[];
  } | null>(null);
  const [hasDataForSeoKey, setHasDataForSeoKey] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/settings/keys")
      .then((r) => r.json())
      .then((d) => {
        const configured = !!d?.keys?.find(
          (k: { provider: string; hasCredentials: boolean }) =>
            k.provider === "dataforseo" && k.hasCredentials
        );
        setHasDataForSeoKey(configured);
      })
      .catch(() => setHasDataForSeoKey(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!target1.trim() || !target2.trim()) return;

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch("/api/domain/gap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target1: target1.trim(),
          target2: target2.trim(),
        }),
      });
      const json = await res.json();

      if (!json.success) {
        if (json.error === "API_KEYS_REQUIRED") {
          setError("DataForSEO is not configured. Check Settings.");
        } else {
          setError(json.message ?? json.error ?? "Request failed");
        }
        return;
      }
      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="hero-shell p-5 md:p-6">
        <span className="hero-kicker">Competitor Intelligence</span>
        <h1 className="hero-title mt-3">Keyword Gap</h1>
        <p className="mt-2 max-w-3xl text-[1rem] text-zinc-600">
          Compare two domains to find shared keywords, overlap, and opportunities – like Semrush’s Keyword Gap.
        </p>
        <span className="mt-3 inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm text-emerald-700">
          DataForSEO Domain Intersection API
        </span>
      </div>

      {hasDataForSeoKey === false && (
        <div className="rounded-xl border border-orange-500/45 bg-orange-500/10 p-4 text-sm text-orange-200">
          DataForSEO is not configured. Check{" "}
          <a href="/settings" className="font-medium underline">
            Settings
          </a>
          .
        </div>
      )}

      <form onSubmit={handleSubmit} className="panel p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-600">
              Domain 1 (your site)
            </label>
            <input
              type="text"
              value={target1}
              onChange={(e) => setTarget1(e.target.value)}
              placeholder="example.com"
              className="w-full py-2.5 disabled:opacity-50"
              disabled={loading}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-600">
              Domain 2 (competitor)
            </label>
            <input
              type="text"
              value={target2}
              onChange={(e) => setTarget2(e.target.value)}
              placeholder="competitor.com"
              className="w-full py-2.5 disabled:opacity-50"
              disabled={loading}
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="btn-primary mt-4 flex items-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Comparing...
            </>
          ) : (
            <>
              <GitCompare className="h-5 w-5" />
              Compare Domains
            </>
          )}
        </button>
      </form>

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
          {error}
        </div>
      )}

      {data && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="text-zinc-500">Shared keywords between</span>
            <span className="font-semibold text-cyan-100">{data.domain1}</span>
            <span className="text-zinc-500">and</span>
            <span className="font-semibold text-fuchsia-200">{data.domain2}</span>
            <span className="rounded-full border border-[var(--border)] bg-[#1a1236] px-3 py-1 text-zinc-400">
              {data.keywords.length} keywords
            </span>
          </div>

          <div className="panel overflow-hidden">
            <div className="border-b border-[var(--border)] bg-[#1a1236]/70 px-4 py-3">
              <h3 className="font-heading text-base font-semibold text-cyan-100">
                Keyword Overlap Matrix
              </h3>
              <p className="mt-1 text-xs text-zinc-500">
                Keywords both domains rank for. Position 1 = {data.domain1}, Position 2 ={" "}
                {data.domain2}.
              </p>
            </div>
            <div className="max-h-[500px] overflow-y-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[#1a1236]/90">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-cyan-100">
                      Keyword
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-cyan-100">
                      Pos (D1)
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-cyan-100">
                      Pos (D2)
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-cyan-100">
                      Volume
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-cyan-100">
                      CPC
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-cyan-100">
                      ETV
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.keywords.slice(0, 200).map((row, i) => (
                    <tr
                      key={i}
                      className="border-b border-[var(--border)]/50 transition-colors hover:bg-[#1a1236]/55"
                    >
                      <td className="px-4 py-3 font-medium text-foreground">{row.keyword}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="text-cyan-200">#{row.position1 ?? "—"}</span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="text-fuchsia-200">#{row.position2 ?? "—"}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-500">
                        {row.searchVolume != null
                          ? row.searchVolume.toLocaleString()
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-500">
                        {row.cpc != null ? `$${row.cpc.toFixed(2)}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-500">
                        {row.etv != null ? `$${Math.round(row.etv)}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

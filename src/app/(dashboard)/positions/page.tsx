"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { BarChart3, Loader2, TrendingUp } from "lucide-react";

type Project = { id: string; name: string; domain: string };

function PositionsContent() {
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get("projectId");
  const [keyword, setKeyword] = useState("");
  const [target, setTarget] = useState("");
  const [projectId, setProjectId] = useState(projectIdParam || "");
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (projectIdParam) {
      setProjectId(projectIdParam);
      const proj = projects.find((p) => p.id === projectIdParam);
      if (proj && !target) setTarget(proj.domain);
    }
  }, [projectIdParam, projects]);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((d) => setProjects(d.projects || []))
      .catch(() => setProjects([]));
  }, []);
  const [result, setResult] = useState<{
    keyword: string;
    target: string;
    position: number | null;
    url: string | null;
    results: { position: number; url: string; title: string; domain: string; isTarget: boolean }[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasDataForSeoKey, setHasDataForSeoKey] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/settings/keys")
      .then((r) => r.json())
      .then((d) => {
        const configured = !!d?.keys?.find((k: { provider: string; hasCredentials: boolean }) => k.provider === "dataforseo")?.hasCredentials;
        setHasDataForSeoKey(configured);
      })
      .catch(() => setHasDataForSeoKey(false));
  }, []);

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
          projectId: projectId || undefined,
        }),
      });
      const data = await res.json();

      if (!data.success) {
        if (data.error === "API_KEYS_REQUIRED") {
          setError(data.message || "DataForSEO is not configured by the account owner yet.");
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
    <div className="space-y-6">
      <div className="hero-shell p-5 md:p-6">
        <span className="hero-kicker">SERP Intelligence</span>
        <h1 className="hero-title mt-3">Position Tracking</h1>
        <p className="mt-2 max-w-3xl text-[1rem] text-zinc-600">
          Inspect ranking position against live SERP results and capture tracked visibility inside your projects.
        </p>
        <span className="mt-3 inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm text-emerald-700">
          DataForSEO live feed
        </span>
      </div>

      {hasDataForSeoKey === false && (
        <div className="rounded-xl border border-orange-500/45 bg-orange-500/10 p-4 text-sm text-orange-200">
          DataForSEO is managed by the account owner. Service is currently not configured. Check{" "}
          <a href="/settings" className="font-medium underline hover:text-orange-100">
            Settings
          </a>{" "}
          for service status.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-600">Keyword</label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="e.g. best seo tools"
              className="w-full py-2.5 disabled:opacity-50"
              disabled={loading}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-600">Your domain</label>
            <input
              type="text"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="example.com"
              className="w-full py-2.5 disabled:opacity-50"
              disabled={loading}
            />
          </div>
          {projects.length > 0 && (
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-zinc-600">Track in project (optional)</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full py-2.5"
                disabled={loading}
                aria-label="Track in project"
              >
                <option value="">Don&apos;t track</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.domain})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <button
          type="submit"
          disabled={loading}
          className="btn-primary flex items-center gap-2 disabled:opacity-50"
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
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
          {error}
          {(error.includes("Settings") || error.includes("Upgrade") || error.includes("owner")) && (
            <a href="/settings" className="ml-2 font-medium text-[var(--accent-muted)] underline">Go to Settings</a>
          )}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="panel p-5">
            <h3 className="font-heading text-lg font-semibold text-foreground">Results</h3>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <span className="text-zinc-500">Keyword:</span>
              <span className="font-medium text-foreground">{result.keyword}</span>
              <span className="text-zinc-500">|</span>
              <span className="text-zinc-500">Domain:</span>
              <span className="font-medium text-foreground">{result.target}</span>
              <span className="text-zinc-500">|</span>
              <span className="text-zinc-500">Position:</span>
              <span className="font-bold text-[var(--accent)]">
                {result.position ?? "Not in top 100"}
              </span>
            </div>
          </div>

          {result.results.length > 0 && (
            <div className="panel overflow-hidden">
              <h3 className="border-b border-[var(--border)] px-6 py-4 font-heading text-lg font-semibold text-foreground">
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
                        className={`block truncate ${item.isTarget ? "font-medium text-[var(--accent)]" : "text-zinc-600 hover:text-foreground"}`}
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

export default function PositionsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-zinc-500" /></div>}>
      <PositionsContent />
    </Suspense>
  );
}

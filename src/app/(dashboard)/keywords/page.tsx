"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Search, Loader2, TrendingUp, DollarSign, Save, Download } from "lucide-react";

type Project = { id: string; name: string; domain: string };
type KeywordResult = {
  keyword: string;
  volume: number;
  difficulty: number;
  cpc: number;
  competition: number;
};

function KeywordsContent() {
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get("projectId");
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<KeywordResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projectIdParam || "");
  const [saveToProject, setSaveToProject] = useState(!!projectIdParam);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((d) => setProjects(d.projects || []));
  }, []);

  useEffect(() => {
    if (projectIdParam) {
      setSelectedProjectId(projectIdParam);
      setSaveToProject(true);
    }
  }, [projectIdParam]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!keyword.trim()) return;

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const res = await fetch("/api/keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: keyword.trim(), country: "us" }),
      });
      const data = await res.json();

      if (!data.success) {
        if (data.error === "API_KEYS_REQUIRED" || res.status === 402) {
          setError(data.message || "Add DataForSEO credentials in Settings.");
          return;
        }
        throw new Error(data.message || data.error?.[0]?.message || "Failed to fetch keywords");
      }
      setResults(data.data.keywords);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveToProject() {
    if (!results?.length || !selectedProjectId) return;
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword,
          country: "us",
          projectId: selectedProjectId,
          saveKeywords: results,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSaved(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-100">
          Keyword Research
        </h1>
        <p className="mt-1 text-zinc-500">
          Enter a seed keyword to discover related terms, search volume, and difficulty.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="e.g. digital marketing, seo tools"
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
              Searching...
            </>
          ) : (
            <>
              <Search className="h-5 w-5" />
              Search
            </>
          )}
        </button>
      </form>

      {error && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-amber-400">
          {error}
          {error.includes("Settings") && (
            <a href="/settings" className="ml-2 font-medium underline">Go to Settings</a>
          )}
        </div>
      )}

      {results && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            {projects.length > 0 && (
              <>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-zinc-100"
              >
                <option value="">Select project to save...</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.domain})
                  </option>
                ))}
              </select>
              <button
                onClick={handleSaveToProject}
                disabled={!selectedProjectId || saving}
                className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-4 py-2 text-zinc-300 hover:bg-white/5 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? "Saving..." : saved ? "Saved!" : "Save to Project"}
              </button>
              </>
            )}
            <button
              onClick={() => {
                const escape = (v: string | number) =>
                  `"${String(v).replace(/"/g, '""')}"`;
                const csv = [
                  ["Keyword", "Volume", "Difficulty", "CPC", "Competition"].join(","),
                  ...results.map((r) =>
                    [escape(r.keyword), r.volume, r.difficulty, r.cpc.toFixed(2), (r.competition * 100).toFixed(0)].join(",")
                  ),
                ].join("\n");
                const blob = new Blob([csv], { type: "text/csv" });
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = `keywords-${keyword.replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.csv`;
                a.click();
                URL.revokeObjectURL(a.href);
              }}
              className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-4 py-2 text-zinc-300 hover:bg-white/5"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden mt-4">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)] bg-zinc-900/50">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-300">
                    Keyword
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-300">
                    Volume
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-300">
                    Difficulty
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-300">
                    CPC
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-300">
                    Competition
                  </th>
                </tr>
              </thead>
              <tbody>
                {results.map((row, i) => (
                  <tr
                    key={i}
                    className="border-b border-[var(--border)]/50 transition-colors hover:bg-white/5"
                  >
                    <td className="px-6 py-4">
                      <span className="font-medium text-zinc-100">{row.keyword}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-2 text-zinc-300">
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                        {row.volume.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={
                          row.difficulty > 70
                            ? "text-red-400"
                            : row.difficulty > 40
                              ? "text-amber-400"
                              : "text-emerald-400"
                        }
                      >
                        {row.difficulty}%
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-2 text-zinc-300">
                        <DollarSign className="h-4 w-4 text-zinc-500" />
                        {row.cpc.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-zinc-400">
                        {(row.competition * 100).toFixed(0)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}
    </div>
  );
}

export default function KeywordsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-zinc-500" /></div>}>
      <KeywordsContent />
    </Suspense>
  );
}

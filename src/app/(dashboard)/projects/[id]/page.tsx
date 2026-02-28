"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Search, FileSearch, Loader2, BarChart3, Globe2, Download } from "lucide-react";

type Project = {
  id: string;
  name: string;
  domain: string;
  keywords: {
    keyword: string;
    volume: number | null;
    difficulty: number | null;
    folder?: { id: string; name: string } | null;
  }[];
  keywordFolders?: { id: string; name: string; _count: { keywords: number } }[];
  trackedKeywords?: {
    id: string;
    keyword: string;
    domain: string | null;
    position: number | null;
    lastChecked: string | null;
    positionHistory: { position: number | null; checkedAt: string }[];
  }[];
};

type GscData = {
  siteUrl: string;
  range: { startDate: string; endDate: string };
  summary: { totalClicks: number; totalImpressions: number; avgCtr: number; avgPosition: number };
  topQueries: Array<{ query: string; clicks: number; impressions: number; ctr: number; position: number }>;
  topPages: Array<{ page: string; clicks: number; impressions: number; ctr: number; position: number }>;
  countries: Array<{ country: string; clicks: number; impressions: number; ctr: number; position: number }>;
  devices: Array<{ device: string; clicks: number; impressions: number; ctr: number; position: number }>;
  source?: "gsc" | "estimated" | "unavailable";
  sourceNote?: string;
};

export default function ProjectDetailPage() {
  const params = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [gscLoading, setGscLoading] = useState(false);
  const [gscError, setGscError] = useState<string | null>(null);
  const [gscData, setGscData] = useState<GscData | null>(null);
  const [gscSiteUrl, setGscSiteUrl] = useState("");
  const [gscStartDate, setGscStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 28);
    return d.toISOString().slice(0, 10);
  });
  const [gscEndDate, setGscEndDate] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    fetch(`/api/projects/${params.id}`)
      .then((r) => r.json())
      .then((d) => setProject(d.project))
      .catch(() => setProject(null))
      .finally(() => setLoading(false));
  }, [params.id]);

  useEffect(() => {
    if (!project?.domain) return;
    const normalized = project.domain.replace(/^https?:\/\//, "").replace(/\/+$/, "");
    setGscSiteUrl(`https://${normalized}/`);
  }, [project?.domain]);

  async function handleFetchGsc() {
    if (!project) return;
    setGscLoading(true);
    setGscError(null);
    setGscData(null);
    try {
      const res = await fetch(`/api/projects/${project.id}/gsc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteUrl: gscSiteUrl.trim(),
          startDate: gscStartDate,
          endDate: gscEndDate,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || data.error || "Failed to fetch GSC");
      setGscData(data.data as GscData);
    } catch (err) {
      setGscError(err instanceof Error ? err.message : "Failed to fetch Search Console data");
    } finally {
      setGscLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-16">
        <p className="text-zinc-500">Project not found</p>
        <Link href="/projects" className="mt-4 inline-block text-[var(--accent)]">
          Back to Projects
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex items-center gap-4">
        <Link
          href="/projects"
          className="rounded-xl p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="font-heading text-4xl font-semibold tracking-tight text-foreground">
            {project.name}
          </h1>
          <p className="text-zinc-500">{project.domain}</p>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Link
          href={`/keywords?projectId=${project.id}`}
          className="flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-sm)] transition-all duration-200 hover:border-zinc-300 hover:shadow-[var(--shadow)]"
        >
          <div className="rounded-xl bg-orange-100 p-3">
            <Search className="h-8 w-8 text-orange-600" />
          </div>
          <div>
            <h3 className="font-heading text-lg font-semibold text-foreground">Keyword Research</h3>
            <p className="text-sm text-zinc-500">
              {project.keywords?.length || 0} keywords saved
            </p>
          </div>
        </Link>
        <Link
          href={`/audit?projectId=${project.id}&url=${encodeURIComponent(`https://${project.domain}`)}`}
          className="flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-sm)] transition-all duration-200 hover:border-zinc-300 hover:shadow-[var(--shadow)]"
        >
          <div className="rounded-xl bg-emerald-100 p-3">
            <FileSearch className="h-8 w-8 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-heading text-lg font-semibold text-foreground">Site Audit</h3>
            <p className="text-sm text-zinc-500">Audit this site</p>
          </div>
        </Link>
        <Link
          href={`/positions?projectId=${project.id}`}
          className="flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-sm)] transition-all duration-200 hover:border-zinc-300 hover:shadow-[var(--shadow)]"
        >
          <div className="rounded-xl bg-blue-100 p-3">
            <BarChart3 className="h-8 w-8 text-blue-600" />
          </div>
          <div>
            <h3 className="font-heading text-lg font-semibold text-foreground">Position Tracking</h3>
            <p className="text-sm text-zinc-500">
              {project.trackedKeywords?.length || 0} keywords tracked
            </p>
          </div>
        </Link>
      </div>

      {project.trackedKeywords && project.trackedKeywords.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-sm)]">
          <h3 className="border-b border-[var(--border)] px-6 py-4 font-heading text-lg font-semibold text-foreground">
            Tracked Keywords
          </h3>
          <div className="divide-y divide-[var(--border)]">
            {project.trackedKeywords.map((tk) => (
              <div key={tk.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">{tk.keyword}</span>
                  <span className="text-[var(--accent)] font-bold">
                    #{tk.position ?? "—"}
                  </span>
                </div>
                {tk.positionHistory.length > 0 && (
                  <p className="mt-1 text-xs text-zinc-500">
                    History: {tk.positionHistory.map((h) => `#${h.position ?? "—"}`).join(" → ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {project.keywords && project.keywords.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-sm)]">
          <h3 className="border-b border-[var(--border)] px-6 py-4 font-heading text-lg font-semibold text-foreground">
            Saved Keywords
          </h3>
          {project.keywordFolders && project.keywordFolders.length > 0 && (
            <div className="border-b border-[var(--border)] px-6 py-3">
              <div className="flex flex-wrap gap-2">
                {project.keywordFolders.map((folder) => (
                  <span
                    key={folder.id}
                    className="rounded-full border border-cyan-400/35 bg-cyan-500/10 px-2.5 py-1 text-xs text-cyan-100"
                  >
                    {folder.name} ({folder._count.keywords})
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="divide-y divide-[var(--border)]">
            {project.keywords.map((k, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-6 py-3"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{k.keyword}</span>
                  {k.folder?.name && (
                    <span className="rounded-full border border-fuchsia-400/35 bg-fuchsia-500/10 px-2 py-0.5 text-[11px] text-fuchsia-200">
                      {k.folder.name}
                    </span>
                  )}
                </div>
                <div className="flex gap-4 text-sm text-zinc-500">
                  {k.volume != null && <span>Vol: {k.volume.toLocaleString()}</span>}
                  {k.difficulty != null && <span>Diff: {k.difficulty}%</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow-sm)]">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe2 className="h-5 w-5 text-emerald-400" />
            <h3 className="font-heading text-lg font-semibold text-foreground">Google Search Console</h3>
          </div>
          <a
            href="https://search.google.com/search-console"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-[var(--accent)] hover:underline"
          >
            Open GSC
          </a>
        </div>
        <p className="mb-3 text-sm text-zinc-500">
          Fetch real Search Console data for this project (queries, pages, countries, devices).
        </p>
        {gscData?.source === "estimated" && (
          <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {gscData.sourceNote || "Showing estimated data because direct Google Search Console access is unavailable for this property."}
          </div>
        )}
        {gscData?.source === "unavailable" && (
          <div className="mb-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
            {gscData.sourceNote || "No data available for this domain yet."}
          </div>
        )}
        <div className="grid gap-3 md:grid-cols-4">
          <input
            value={gscSiteUrl}
            onChange={(e) => setGscSiteUrl(e.target.value)}
            placeholder="sc-domain:example.com or https://example.com/"
            className="md:col-span-2 w-full py-2.5"
          />
          <input
            type="date"
            value={gscStartDate}
            onChange={(e) => setGscStartDate(e.target.value)}
            className="w-full py-2.5"
            aria-label="GSC start date"
          />
          <input
            type="date"
            value={gscEndDate}
            onChange={(e) => setGscEndDate(e.target.value)}
            className="w-full py-2.5"
            aria-label="GSC end date"
          />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={handleFetchGsc}
            disabled={gscLoading}
            className="btn-secondary flex items-center gap-2 disabled:opacity-50"
          >
            {gscLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe2 className="h-4 w-4" />}
            {gscLoading ? "Fetching..." : "Fetch Search Console Data"}
          </button>
          {gscData && (
            <button
              type="button"
              className="btn-secondary flex items-center gap-2"
              onClick={() => {
                const csvRows = [
                  ["Section", "Key", "Clicks", "Impressions", "CTR", "Position"].join(","),
                  ...gscData.topQueries.map((r) => ["Query", `"${r.query.replace(/"/g, '""')}"`, r.clicks, r.impressions, r.ctr.toFixed(2), r.position.toFixed(2)].join(",")),
                  ...gscData.topPages.map((r) => ["Page", `"${r.page.replace(/"/g, '""')}"`, r.clicks, r.impressions, r.ctr.toFixed(2), r.position.toFixed(2)].join(",")),
                ].join("\n");
                const blob = new Blob([csvRows], { type: "text/csv" });
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = `gsc-${project.domain}-${new Date().toISOString().slice(0, 10)}.csv`;
                a.click();
                URL.revokeObjectURL(a.href);
              }}
            >
              <Download className="h-4 w-4" />
              Export GSC CSV
            </button>
          )}
        </div>
        {gscError && (
          <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {gscError}
          </div>
        )}
        {gscData && (
          <div className="mt-4 space-y-4">
            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-xl border border-[var(--border)] bg-[#120b28] p-3">
                <p className="text-xs text-zinc-500">{gscData.source === "estimated" ? "Estimated Clicks" : "Clicks"}</p>
                <p className="font-heading text-xl text-foreground">{gscData.summary.totalClicks.toLocaleString()}</p>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[#120b28] p-3">
                <p className="text-xs text-zinc-500">{gscData.source === "estimated" ? "Estimated Impressions" : "Impressions"}</p>
                <p className="font-heading text-xl text-foreground">{gscData.summary.totalImpressions.toLocaleString()}</p>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[#120b28] p-3">
                <p className="text-xs text-zinc-500">Avg CTR</p>
                <p className="font-heading text-xl text-foreground">{gscData.summary.avgCtr.toFixed(2)}%</p>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[#120b28] p-3">
                <p className="text-xs text-zinc-500">Avg Position</p>
                <p className="font-heading text-xl text-foreground">{gscData.summary.avgPosition.toFixed(2)}</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-[var(--border)] p-3">
                <p className="mb-2 text-sm font-semibold text-foreground">Top Queries</p>
                {gscData.topQueries.length === 0 ? (
                  <p className="text-xs text-zinc-500">No query rows available.</p>
                ) : (
                  <div className="space-y-1">
                    {gscData.topQueries.slice(0, 8).map((q) => (
                      <div key={q.query} className="flex items-center justify-between text-xs">
                        <span className="max-w-[70%] truncate text-zinc-500">{q.query}</span>
                        <span className="text-foreground">{q.clicks.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="rounded-xl border border-[var(--border)] p-3">
                <p className="mb-2 text-sm font-semibold text-foreground">Top Pages</p>
                {gscData.topPages.length === 0 ? (
                  <p className="text-xs text-zinc-500">No page rows available.</p>
                ) : (
                  <div className="space-y-1">
                    {gscData.topPages.slice(0, 8).map((p) => (
                      <div key={p.page} className="flex items-center justify-between text-xs">
                        <span className="max-w-[70%] truncate text-zinc-500">{p.page}</span>
                        <span className="text-foreground">{p.clicks.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Search, FileSearch, Loader2, BarChart3, Link as LinkIcon, RefreshCw } from "lucide-react";

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

type GscMetricRow = {
  key: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

type GscData = {
  projectId: string;
  projectName: string;
  projectDomain: string;
  property?: string;
  startDate?: string;
  endDate?: string;
  summary?: { clicks: number; impressions: number; ctr: number; position: number };
  manualOverride?: boolean;
  topQueries?: GscMetricRow[];
  topPages?: GscMetricRow[];
  countries?: GscMetricRow[];
  devices?: GscMetricRow[];
  availableProperties?: string[];
  message?: string;
};

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [gscLoading, setGscLoading] = useState(false);
  const [gscError, setGscError] = useState<string | null>(null);
  const [gscData, setGscData] = useState<GscData | null>(null);
  const [selectedProperty, setSelectedProperty] = useState("");

  useEffect(() => {
    fetch(`/api/projects/${params.id}`)
      .then((r) => r.json())
      .then((d) => setProject(d.project))
      .catch(() => setProject(null))
      .finally(() => setLoading(false));
  }, [params.id]);

  async function fetchGsc(property?: string) {
    if (!project) return;
    setGscLoading(true);
    setGscError(null);
    try {
      const q = property ? `?property=${encodeURIComponent(property)}` : "";
      const res = await fetch(`/api/projects/${project.id}/gsc${q}`);
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || "Failed to fetch Search Console data");
      }
      setGscData(data.data);
      const firstProperty = data.data?.property || data.data?.availableProperties?.[0] || "";
      setSelectedProperty(firstProperty);
    } catch (e) {
      setGscError(e instanceof Error ? e.message : "Failed to fetch Search Console data");
      setGscData(null);
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

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-sm)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-heading text-lg font-semibold text-foreground">Google Search Console</h3>
            <p className="text-sm text-zinc-500">
              Fetch clicks, impressions, CTR, position, and top queries/pages for this project domain.
            </p>
          </div>
          <button
            type="button"
            onClick={() => fetchGsc(selectedProperty || undefined)}
            disabled={gscLoading}
            className="btn-secondary flex items-center gap-2 disabled:opacity-50"
          >
            {gscLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {gscLoading ? "Fetching..." : "Fetch GSC Data"}
          </button>
        </div>

        {!!gscData?.availableProperties?.length && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <LinkIcon className="h-4 w-4 text-zinc-500" />
            <select
              value={selectedProperty}
              onChange={(e) => setSelectedProperty(e.target.value)}
              className="min-w-[320px] max-w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-foreground"
              aria-label="Select GSC property"
            >
              {gscData.availableProperties.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => fetchGsc(selectedProperty)}
              disabled={!selectedProperty || gscLoading}
              className="btn-secondary disabled:opacity-50"
            >
              Use Property
            </button>
          </div>
        )}

        {gscError && (
          <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {gscError}
          </div>
        )}

        {gscData?.message && !gscData.summary && (
          <div className="mt-4 rounded-xl border border-cyan-300/40 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
            {gscData.message}
          </div>
        )}

        {gscData?.summary && (
          <>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Clicks" value={gscData.summary.clicks.toLocaleString()} />
              <Stat label="Impressions" value={gscData.summary.impressions.toLocaleString()} />
              <Stat label="CTR" value={`${(gscData.summary.ctr * 100).toFixed(2)}%`} />
              <Stat label="Avg Position" value={gscData.summary.position.toFixed(2)} />
            </div>

            <div className="mt-4 text-xs text-zinc-500">
              Property: <span className="text-zinc-300">{gscData.property}</span> • Range:{" "}
              {gscData.startDate} to {gscData.endDate}
            </div>
            {gscData.manualOverride && (
              <div className="mt-2 rounded-lg border border-cyan-300/40 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100">
                Using selected property (manual override).
              </div>
            )}

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <MiniTable title="Top Queries" rows={gscData.topQueries ?? []} />
              <MiniTable title="Top Pages" rows={gscData.topPages ?? []} />
              <MiniTable title="Countries" rows={gscData.countries ?? []} />
              <MiniTable title="Devices" rows={gscData.devices ?? []} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[#120b28]/75 p-3">
      <p className="text-xs uppercase tracking-widest text-zinc-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

function MiniTable({ title, rows }: { title: string; rows: GscMetricRow[] }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[#120b28]/75 p-3">
      <p className="text-sm font-semibold text-cyan-100">{title}</p>
      <div className="mt-2 space-y-1.5">
        {rows.length === 0 && <p className="text-xs text-zinc-500">No data</p>}
        {rows.slice(0, 8).map((r) => (
          <div key={`${title}-${r.key}`} className="flex items-center justify-between gap-3 text-xs">
            <span className="truncate text-zinc-300">{r.key || "—"}</span>
            <span className="shrink-0 text-zinc-500">{r.clicks.toLocaleString()} clicks</span>
          </div>
        ))}
      </div>
    </div>
  );
}

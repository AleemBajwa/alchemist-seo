"use client";

import { useState, useEffect } from "react";
import {
  Globe,
  Loader2,
  TrendingUp,
  Link2,
  FileText,
  BarChart3,
  ExternalLink,
  History,
} from "lucide-react";

type OverviewData = {
  domain: string;
  rank: number | null;
  etv: number | null;
  count: number | null;
  isNew: boolean | null;
  items: unknown[];
};

type OrganicRow = {
  keyword: string;
  position: number | null;
  searchVolume: number | null;
  cpc: number | null;
  competition: number | null;
  etv: number | null;
};

type BacklinksData = {
  domain: string;
  backlinks: number | null;
  referringDomains: number | null;
  referringMainDomains: number | null;
  rank: number | null;
  brokenBacklinks: number | null;
  error?: string;
  errorCode?: number;
};

export default function DomainAnalyticsPage() {
  const [target, setTarget] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [organic, setOrganic] = useState<OrganicRow[]>([]);
  const [organicTotalCount, setOrganicTotalCount] = useState<number | null>(null);
  const [backlinks, setBacklinks] = useState<BacklinksData | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "organic" | "backlinks" | "history">("overview");
  const [snapshots, setSnapshots] = useState<Array<{
    id: string;
    domain: string;
    etv: number | null;
    keywordCount: number | null;
    rank: number | null;
    backlinks: number | null;
    referringDomains: number | null;
    snapshotMonth: string;
    createdAt: string;
  }>>([]);
  const [hasDataForSeoKey, setHasDataForSeoKey] = useState<boolean | null>(null);

  useEffect(() => {
    const domainForHistory = overview?.domain ?? (target.trim() ? target.replace(/^www\./, "").split(/[/?#]/)[0]?.trim() : null);
    if (activeTab === "history" && domainForHistory) {
      fetch(`/api/domain/snapshots?domain=${encodeURIComponent(domainForHistory)}`)
        .then((r) => r.json())
        .then((d) => { if (d?.snapshots) setSnapshots(d.snapshots); })
        .catch(() => {});
    }
  }, [activeTab, overview?.domain, target]);

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
    if (!target.trim()) return;

    setLoading(true);
    setError(null);
    setOverview(null);
    setOrganic([]);
    setOrganicTotalCount(null);
    setBacklinks(null);

    try {
      const domain = target.startsWith("http")
        ? new URL(target).hostname.replace(/^www\./, "")
        : target.replace(/^www\./, "");

      const [overviewRes, organicRes, backlinksRes] = await Promise.all([
        fetch("/api/domain/overview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ target: domain }),
        }),
        fetch("/api/domain/organic", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ target: domain, limit: 100 }),
        }),
        fetch("/api/domain/backlinks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ target: domain }),
        }),
      ]);

      const overviewData = await overviewRes.json();
      const organicData = await organicRes.json();
      const backlinksData = await backlinksRes.json();

      if (!overviewData.success && overviewData.error === "API_KEYS_REQUIRED") {
        setError("DataForSEO is not configured. Check Settings.");
        return;
      }
      if (organicData.success) {
        setOrganic(organicData.data?.keywords ?? []);
        setOrganicTotalCount(organicData.data?.totalCount ?? null);
      }
      if (overviewData.success) setOverview(overviewData.data);
      if (backlinksData.success) setBacklinks(backlinksData.data);

      if (overviewData.success || organicData.success || backlinksData.success) {
        try {
          await fetch("/api/domain/snapshots", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              domain,
              etv: overviewData.data?.etv ?? null,
              keywordCount: organicData.data?.totalCount ?? overviewData.data?.count ?? null,
              rank: overviewData.data?.rank ?? backlinksData.data?.rank ?? null,
              backlinks: backlinksData.success ? backlinksData.data?.backlinks ?? null : null,
              referringDomains: backlinksData.success ? backlinksData.data?.referringDomains ?? null : null,
            }),
          });
        } catch {
          // ignore snapshot save failure
        }
        try {
          const histRes = await fetch(`/api/domain/snapshots?domain=${encodeURIComponent(domain)}`);
          const histData = await histRes.json();
          if (histData?.snapshots) setSnapshots(histData.snapshots);
        } catch {
          // ignore history fetch failure
        }
      }

      if (!overviewData.success && !organicData.success && !backlinksData.success) {
        setError(
          overviewData.message ?? organicData.message ?? backlinksData.message ?? "Request failed"
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const hasData = overview || organic.length > 0 || backlinks || organicTotalCount != null;

  return (
    <div className="space-y-6">
      <div className="hero-shell p-5 md:p-6">
        <span className="hero-kicker">Domain Analytics</span>
        <h1 className="hero-title mt-3">Domain Overview</h1>
        <p className="mt-2 max-w-3xl text-[1rem] text-zinc-600">
          Analyze any domain: visibility, organic keywords, backlinks, and authority metrics – Semrush-style.
        </p>
        <span className="mt-3 inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm text-emerald-700">
          DataForSEO Labs & Backlinks API
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
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Globe className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="example.com or https://example.com"
              className="w-full py-2.5 pl-12 pr-4 disabled:opacity-50"
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <BarChart3 className="h-5 w-5" />
                Analyze Domain
              </>
            )}
          </button>
        </div>
      </form>

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
          {error}
        </div>
      )}

      {hasData && (
        <>
          <div className="flex gap-2 border-b border-[var(--border)]">
            {[
              { id: "overview" as const, label: "Overview", icon: BarChart3 },
              { id: "organic" as const, label: "Organic Keywords", icon: FileText },
              { id: "backlinks" as const, label: "Backlinks", icon: Link2 },
              { id: "history" as const, label: "History", icon: History },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === id
                    ? "border-[var(--accent)] text-[var(--accent)]"
                    : "border-transparent text-zinc-500 hover:text-zinc-200"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          {backlinks?.error && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              <strong>Backlinks & Domain Rank:</strong> {backlinks.error}
              {backlinks.errorCode === 40204 && (
                <span className="block mt-2 text-amber-300/90">
                  The Backlinks API requires a separate DataForSEO subscription ($100/mo minimum). Your Labs plan covers keywords and SERP data only.
                </span>
              )}
            </div>
          )}

          {activeTab === "overview" && (overview || backlinks) && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {overview && (
                <>
                  <MetricCard
                    label="Domain Rank"
                    value={
                      overview.rank != null
                        ? overview.rank.toLocaleString()
                        : backlinks?.rank != null
                          ? backlinks.rank.toLocaleString()
                          : "—"
                    }
                    icon={TrendingUp}
                  />
                  <MetricCard
                    label="Est. Traffic Value"
                    value={
                      overview.etv != null
                        ? `$${Math.round(overview.etv).toLocaleString()}`
                        : "—"
                    }
                    icon={BarChart3}
                  />
                  <MetricCard
                    label="Keywords Count"
                    value={
                      organicTotalCount != null
                        ? organicTotalCount.toLocaleString()
                        : overview.count != null
                          ? overview.count.toLocaleString()
                          : "—"
                    }
                    icon={FileText}
                  />
                </>
              )}
              {backlinks && (
                <>
                  <MetricCard
                    label="Backlinks"
                    value={
                      backlinks.backlinks != null
                        ? backlinks.backlinks.toLocaleString()
                        : "—"
                    }
                    icon={Link2}
                  />
                  <MetricCard
                    label="Referring Domains"
                    value={
                      backlinks.referringDomains != null
                        ? backlinks.referringDomains.toLocaleString()
                        : "—"
                    }
                    icon={Globe}
                  />
                </>
              )}
            </div>
          )}

          {activeTab === "organic" && (
            <div className="panel overflow-hidden">
              <h3 className="border-b border-[var(--border)] bg-[#1a1236]/70 px-4 py-3 font-heading text-base font-semibold text-cyan-100">
                Top Organic Keywords
              </h3>
              <div className="max-h-[500px] overflow-y-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[#1a1236]/90">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-cyan-100">
                        Keyword
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-cyan-100">
                        Position
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
                    {organic.slice(0, 100).map((row, i) => (
                      <tr
                        key={i}
                        className="border-b border-[var(--border)]/50 transition-colors hover:bg-[#1a1236]/55"
                      >
                        <td className="px-4 py-3 font-medium text-foreground">{row.keyword}</td>
                        <td className="px-4 py-3 text-sm text-zinc-500">
                          #{row.position ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-500">
                          {row.searchVolume != null ? row.searchVolume.toLocaleString() : "—"}
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-500">
                          {row.cpc != null ? `$${row.cpc.toFixed(2)}` : "—"}
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-500">
                          {row.etv != null ? `$${Math.round(row.etv as number)}` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "history" && (
            <div className="panel overflow-hidden">
              <h3 className="border-b border-[var(--border)] bg-[#1a1236]/70 px-4 py-3 font-heading text-base font-semibold text-cyan-100">
                Historical Snapshots
              </h3>
              <div className="max-h-[500px] overflow-y-auto">
                {snapshots.length === 0 ? (
                  <p className="p-4 text-zinc-500">No historical data yet. Run an analysis to start tracking.</p>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[var(--border)] bg-[#1a1236]/90">
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-cyan-100">Month</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-cyan-100">ETV</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-cyan-100">Keywords</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-cyan-100">Rank</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-cyan-100">Backlinks</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-cyan-100">Referring Domains</th>
                      </tr>
                    </thead>
                    <tbody>
                      {snapshots.map((s) => (
                        <tr key={s.id} className="border-b border-[var(--border)]/50 transition-colors hover:bg-[#1a1236]/55">
                          <td className="px-4 py-3 font-medium text-foreground">{s.snapshotMonth}</td>
                          <td className="px-4 py-3 text-sm text-zinc-500">{s.etv != null ? `$${Math.round(s.etv).toLocaleString()}` : "—"}</td>
                          <td className="px-4 py-3 text-sm text-zinc-500">{s.keywordCount != null ? s.keywordCount.toLocaleString() : "—"}</td>
                          <td className="px-4 py-3 text-sm text-zinc-500">{s.rank != null ? s.rank.toLocaleString() : "—"}</td>
                          <td className="px-4 py-3 text-sm text-zinc-500">{s.backlinks != null ? s.backlinks.toLocaleString() : "—"}</td>
                          <td className="px-4 py-3 text-sm text-zinc-500">{s.referringDomains != null ? s.referringDomains.toLocaleString() : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {activeTab === "backlinks" && backlinks && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                label="Total Backlinks"
                value={
                  backlinks.backlinks != null
                    ? backlinks.backlinks.toLocaleString()
                    : "—"
                }
                icon={Link2}
              />
              <MetricCard
                label="Referring Domains"
                value={
                  backlinks.referringDomains != null
                    ? backlinks.referringDomains.toLocaleString()
                    : "—"
                }
                icon={Globe}
              />
              <MetricCard
                label="Referring Main Domains"
                value={
                  backlinks.referringMainDomains != null
                    ? backlinks.referringMainDomains.toLocaleString()
                    : "—"
                }
                icon={ExternalLink}
              />
              <MetricCard
                label="Broken Backlinks"
                value={
                  backlinks.brokenBacklinks != null
                    ? backlinks.brokenBacklinks.toLocaleString()
                    : "—"
                }
                icon={Link2}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="panel p-4">
      <div className="mb-2 flex items-center gap-2 text-cyan-200">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <p className="font-heading text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

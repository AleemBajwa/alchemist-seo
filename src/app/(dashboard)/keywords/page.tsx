"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Search, Loader2, TrendingUp, DollarSign, Save, Download, Sparkles } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import * as XLSX from "xlsx";

type Project = { id: string; name: string; domain: string };
type KeywordFolder = { id: string; name: string; _count?: { keywords: number } };
type KeywordResult = {
  keyword: string;
  volume: number;
  difficulty: number;
  cpc: number;
  competition: number;
  monthlySearches?: { year: number; month: number; search_volume: number }[];
};
type SerpRow = {
  rank: number;
  title: string;
  url: string;
  domain: string;
  estimatedTraffic: number | null;
  domainAuthority: number | null;
  backlinks: number | null;
};
type KeywordCluster = {
  label: string;
  keywordCount: number;
  totalVolume: number;
  avgDifficulty: number;
  keywords: Array<{ keyword: string; volume: number; difficulty: number }>;
};
type SuggestionPayload = {
  related: KeywordResult[];
  longTail: KeywordResult[];
  questions: KeywordResult[];
  semantic: KeywordResult[];
  autocomplete: string[];
  source: string;
};

const COUNTRY_OPTIONS = [
  { value: "us", label: "United States" },
  { value: "uk", label: "United Kingdom" },
  { value: "ca", label: "Canada" },
  { value: "au", label: "Australia" },
  { value: "in", label: "India" },
];

const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "de", label: "German" },
  { value: "fr", label: "French" },
  { value: "it", label: "Italian" },
];

function KeywordsContent() {
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get("projectId");
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<KeywordResult[] | null>(null);
  const [serpRows, setSerpRows] = useState<SerpRow[]>([]);
  const [keywordClusters, setKeywordClusters] = useState<KeywordCluster[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestionPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projectIdParam || "");
  const [projectFolders, setProjectFolders] = useState<KeywordFolder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>("");
  const [newFolderName, setNewFolderName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hasDataForSeoKey, setHasDataForSeoKey] = useState<boolean | null>(null);
  const [country, setCountry] = useState("us");
  const [language, setLanguage] = useState("en");
  const [tagMap, setTagMap] = useState<Record<string, string[]>>({});
  const [tagDrafts, setTagDrafts] = useState<Record<string, string>>({});
  const [activeTag, setActiveTag] = useState<string>("");
  const [intentMap, setIntentMap] = useState<Record<string, "informational" | "navigational" | "commercial" | "transactional">>({});
  const [intentLoading, setIntentLoading] = useState(false);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((d) => setProjects(d.projects || []));
  }, []);

  useEffect(() => {
    fetch("/api/settings/keys")
      .then((r) => r.json())
      .then((d) => {
        const configured = !!d?.keys?.find((k: { provider: string; hasCredentials: boolean }) => k.provider === "dataforseo")?.hasCredentials;
        setHasDataForSeoKey(configured);
      })
      .catch(() => setHasDataForSeoKey(false));
  }, []);

  useEffect(() => {
    if (projectIdParam) {
      setSelectedProjectId(projectIdParam);
    }
  }, [projectIdParam]);

  useEffect(() => {
    if (!selectedProjectId) {
      setProjectFolders([]);
      setSelectedFolderId("");
      return;
    }
    fetch(`/api/projects/${selectedProjectId}/keyword-folders`)
      .then((r) => r.json())
      .then((d) => {
        setProjectFolders(d.folders || []);
      })
      .catch(() => setProjectFolders([]));
  }, [selectedProjectId]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("alchemy.keywordTags");
      if (raw) setTagMap(JSON.parse(raw) as Record<string, string[]>);
    } catch {
      setTagMap({});
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("alchemy.keywordTags", JSON.stringify(tagMap));
    } catch {
      // ignore storage failures
    }
  }, [tagMap]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!keyword.trim()) return;

    setLoading(true);
    setError(null);
    setResults(null);
    setSerpRows([]);
    setKeywordClusters([]);
    setSuggestions(null);
    setIntentMap({});

    try {
      const res = await fetch("/api/keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: keyword.trim(),
          country,
          language,
        }),
      });
      const data = await res.json();

      if (!data.success) {
        if (data.error === "API_KEYS_REQUIRED" || res.status === 402) {
          setError(data.message || "DataForSEO is not configured by the account owner yet.");
          return;
        }
        throw new Error(data.message || data.error?.[0]?.message || "Failed to fetch keywords");
      }
      setResults(data.data.keywords || []);
      setSerpRows(data.data.serpAnalysis || []);
      setKeywordClusters(data.data.keywordClusters || []);
      setSuggestions(data.data.suggestions || null);
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
          country,
          language,
          projectId: selectedProjectId,
          folderId: selectedFolderId || undefined,
          folderName: newFolderName.trim() || undefined,
          saveKeywords: results,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSaved(true);
        if (newFolderName.trim()) {
          const foldersRes = await fetch(`/api/projects/${selectedProjectId}/keyword-folders`);
          const foldersData = await foldersRes.json();
          const nextFolders = foldersData.folders || [];
          setProjectFolders(nextFolders);
          const match = nextFolders.find(
            (f: KeywordFolder) => f.name.toLowerCase() === newFolderName.trim().toLowerCase()
          );
          if (match?.id) setSelectedFolderId(match.id);
          setNewFolderName("");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  const trendData = (() => {
    if (!results?.length) return [];
    const seed = keyword.trim().toLowerCase();
    const best =
      results.find((r) => r.keyword.toLowerCase() === seed) ?? results[0];
    const monthly = best.monthlySearches ?? [];
    const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return monthly.map((entry) => ({
      month: `${monthLabels[Math.max(0, Math.min(11, entry.month - 1))]} ${entry.year}`,
      volume: entry.search_volume,
    }));
  })();

  const keywordOverview = (() => {
    if (!results?.length) return null;
    const seed = keyword.trim().toLowerCase();
    const match =
      results.find((r) => r.keyword.toLowerCase() === seed) ?? results[0];
    return {
      volume: match.volume,
      difficulty: match.difficulty,
      cpc: match.cpc,
      competition: Math.round((match.competition ?? 0) * 100),
    };
  })();

  const suggestionBuckets = {
    longTail: suggestions?.longTail ?? [],
    questions: suggestions?.questions ?? [],
    semantic: suggestions?.semantic ?? [],
    related: suggestions?.related ?? [],
  };
  const autocompleteSuggestions = suggestions?.autocomplete ?? [];

  const allTags = [...new Set(Object.values(tagMap).flat())].slice(0, 40);
  const displayedResults = (results ?? []).filter((row) => {
    if (!activeTag) return true;
    return (tagMap[row.keyword] ?? []).includes(activeTag);
  });

  function addTag(keywordText: string, rawTag: string) {
    const tag = rawTag.trim().toLowerCase();
    if (!tag) return;
    setTagMap((prev) => {
      const existing = prev[keywordText] ?? [];
      if (existing.includes(tag)) return prev;
      return { ...prev, [keywordText]: [...existing, tag] };
    });
    setTagDrafts((prev) => ({ ...prev, [keywordText]: "" }));
  }

  function removeTag(keywordText: string, tag: string) {
    setTagMap((prev) => {
      const next = (prev[keywordText] ?? []).filter((t) => t !== tag);
      return { ...prev, [keywordText]: next };
    });
  }

  async function handleClassifyIntent() {
    if (!results?.length) return;
    setIntentLoading(true);
    try {
      const res = await fetch("/api/keywords/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords: results.map((r) => r.keyword).slice(0, 50) }),
      });
      const data = await res.json();
      if (data.success && data.data?.intents) setIntentMap(data.data.intents);
    } catch {
      setIntentMap({});
    } finally {
      setIntentLoading(false);
    }
  }

  const getIntentColor = (intent: string) => {
    switch (intent) {
      case "transactional": return "border-emerald-400/40 bg-emerald-500/15 text-emerald-100";
      case "commercial": return "border-cyan-400/40 bg-cyan-500/15 text-cyan-100";
      case "navigational": return "border-violet-400/40 bg-violet-500/15 text-violet-100";
      default: return "border-zinc-400/40 bg-zinc-500/15 text-zinc-100";
    }
  };

  return (
    <div className="space-y-6">
      <div className="hero-shell p-5 md:p-6">
        <span className="hero-kicker">Research Engine</span>
        <h1 className="hero-title mt-3">Keyword Research</h1>
        <p className="mt-2 max-w-3xl text-[1rem] text-zinc-600">
          Enter one seed term to surface high-intent opportunities, volume signals, and difficulty ranges.
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

      <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="e.g. digital marketing, seo tools"
            className="w-full py-2.5 pl-12 pr-4 disabled:opacity-50"
            disabled={loading}
          />
        </div>
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="min-w-44 py-2.5"
          aria-label="Select country"
        >
          {COUNTRY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="min-w-40 py-2.5"
          aria-label="Select language"
        >
          {LANGUAGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={loading}
          className="btn-primary flex items-center gap-2 disabled:opacity-50"
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
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
          {error}
          {(error.includes("Settings") || error.includes("owner")) && (
            <a href="/settings" className="ml-2 font-medium text-[var(--accent-muted)] underline">Go to Settings</a>
          )}
        </div>
      )}

      {results && (
        <>
          {keywordOverview && (
            <div className="grid gap-3 md:grid-cols-4">
              <OverviewCard label="Search Volume" value={keywordOverview.volume.toLocaleString()} />
              <OverviewCard label="Keyword Difficulty" value={`${keywordOverview.difficulty}%`} />
              <OverviewCard label="CPC" value={`$${keywordOverview.cpc.toFixed(2)}`} />
              <OverviewCard label="Competition" value={`${keywordOverview.competition}%`} />
            </div>
          )}

          {trendData.length > 0 && (
            <div className="panel p-4">
              <h3 className="mb-3 font-heading text-lg font-semibold text-foreground">12-Month Trend</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3b2f68" vertical={false} />
                    <XAxis dataKey="month" stroke="#b4b0d6" tickLine={false} axisLine={false} fontSize={11} />
                    <YAxis stroke="#b4b0d6" tickLine={false} axisLine={false} fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#18122f",
                        border: "1px solid var(--border)",
                        borderRadius: "12px",
                      }}
                      formatter={(value: number | undefined) => [Number(value ?? 0).toLocaleString(), "Search volume"]}
                    />
                    <Line type="monotone" dataKey="volume" stroke="#22d3ee" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-3">
            <SuggestionCard title="Long-tail Suggestions" items={suggestionBuckets.longTail} />
            <SuggestionCard title="Question Keywords" items={suggestionBuckets.questions} />
            <SuggestionCard title="Semantic / LSI" items={suggestionBuckets.semantic} />
          </div>

          {suggestionBuckets.related.length > 0 && (
            <div className="panel p-4">
              <h3 className="font-heading text-base font-semibold text-foreground">Related Keywords (Provider-ranked)</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {suggestionBuckets.related.slice(0, 12).map((item) => (
                  <span key={item.keyword} className="rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-2.5 py-1 text-xs text-fuchsia-100">
                    {item.keyword}
                  </span>
                ))}
              </div>
            </div>
          )}

          {keywordClusters.length > 0 && (
            <div className="panel p-4">
              <h3 className="font-heading text-base font-semibold text-foreground">Related Keyword Clusters</h3>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                {keywordClusters.slice(0, 6).map((cluster) => (
                  <div key={cluster.label} className="rounded-xl border border-[var(--border)] bg-[#120b28]/75 p-3">
                    <p className="text-sm font-semibold text-cyan-100">{cluster.label}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {cluster.keywordCount} keywords • {cluster.totalVolume.toLocaleString()} volume • {cluster.avgDifficulty}% KD
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {cluster.keywords.slice(0, 4).map((k) => (
                        <span
                          key={`${cluster.label}-${k.keyword}`}
                          className="rounded-full border border-cyan-400/25 bg-cyan-500/10 px-2 py-0.5 text-[11px] text-cyan-100"
                        >
                          {k.keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="panel p-4">
            <h3 className="font-heading text-base font-semibold text-foreground">Autocomplete Suggestions</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {autocompleteSuggestions.map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => setKeyword(term)}
                  className="rounded-full border border-violet-400/30 bg-violet-500/10 px-2.5 py-1 text-xs text-violet-100 transition-colors hover:bg-violet-500/20"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>

          {serpRows.length > 0 && (
            <div className="panel overflow-hidden">
              <div className="border-b border-[var(--border)] bg-[#1a1236]/70 px-4 py-3">
                <h3 className="font-heading text-base font-semibold text-cyan-100">SERP Analysis (Top 10)</h3>
                <p className="mt-1 text-xs text-zinc-500">
                  Real-time ranking pages with available traffic, authority, and backlink indicators.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[#1a1236]/90">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-cyan-100">Rank</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-cyan-100">Page</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-cyan-100">Domain</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-cyan-100">Est. Traffic</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-cyan-100">Authority</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-cyan-100">Backlinks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {serpRows.map((row) => (
                      <tr key={`${row.rank}-${row.url}`} className="border-b border-[var(--border)]/50 transition-colors hover:bg-[#1a1236]/55">
                        <td className="px-4 py-3 text-sm font-semibold text-foreground">#{row.rank || "-"}</td>
                        <td className="px-4 py-3">
                          <a href={row.url} target="_blank" rel="noopener noreferrer" className="block max-w-[360px] truncate text-sm text-[var(--accent)] hover:underline">
                            {row.title || row.url}
                          </a>
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-500">{row.domain || "-"}</td>
                        <td className="px-4 py-3 text-sm text-zinc-500">
                          {row.estimatedTraffic != null ? Number(row.estimatedTraffic).toLocaleString() : "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-500">
                          {row.domainAuthority != null ? row.domainAuthority.toFixed(1) : "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-500">
                          {row.backlinks != null ? Number(row.backlinks).toLocaleString() : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="panel p-4">
            <h3 className="font-heading text-base font-semibold text-foreground">Keyword Tags & Organization</h3>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTag("")}
                className={`rounded-full border px-2.5 py-1 text-xs ${!activeTag ? "border-cyan-300 bg-cyan-500/15 text-cyan-100" : "border-[var(--border)] text-zinc-500"}`}
              >
                All
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setActiveTag(tag)}
                  className={`rounded-full border px-2.5 py-1 text-xs ${activeTag === tag ? "border-cyan-300 bg-cyan-500/15 text-cyan-100" : "border-[var(--border)] text-zinc-500"}`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleClassifyIntent}
              disabled={!results?.length || intentLoading}
              className="btn-secondary flex items-center gap-2 disabled:opacity-50"
            >
              {intentLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {intentLoading ? "Classifying..." : "AI Intent"}
            </button>
            {projects.length > 0 && (
              <>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-foreground"
                aria-label="Select project to save keywords"
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
                className="btn-secondary flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? "Saving..." : saved ? "Saved!" : "Save to Project"}
              </button>
              </>
            )}
            <button
              type="button"
              onClick={() => {
                const escape = (v: string | number) =>
                  `"${String(v).replace(/"/g, '""')}"`;
                const csv = [
                  ["Keyword", "Volume", "Difficulty", "CPC", "Competition", "Tags"].join(","),
                  ...results.map((r) =>
                    [
                      escape(r.keyword),
                      r.volume,
                      r.difficulty,
                      r.cpc.toFixed(2),
                      (r.competition * 100).toFixed(0),
                      escape((tagMap[r.keyword] ?? []).join("|")),
                    ].join(",")
                  ),
                ].join("\n");
                const blob = new Blob([csv], { type: "text/csv" });
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = `keywords-${keyword.replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.csv`;
                a.click();
                URL.revokeObjectURL(a.href);
              }}
              className="btn-secondary flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
            <button
              type="button"
              onClick={() => {
                const workbook = XLSX.utils.book_new();
                const keywordRows = results.map((r) => ({
                  Keyword: r.keyword,
                  Volume: r.volume,
                  Difficulty: `${r.difficulty}%`,
                  CPC: Number(r.cpc.toFixed(2)),
                  Competition: `${Math.round((r.competition ?? 0) * 100)}%`,
                  Tags: (tagMap[r.keyword] ?? []).join(" | "),
                }));
                const keywordsSheet = XLSX.utils.json_to_sheet(keywordRows);
                XLSX.utils.book_append_sheet(workbook, keywordsSheet, "Keywords");

                if (keywordClusters.length) {
                  const clusterRows = keywordClusters.flatMap((cluster) =>
                    cluster.keywords.map((k) => ({
                      Cluster: cluster.label,
                      Keyword: k.keyword,
                      Volume: k.volume,
                      Difficulty: `${k.difficulty}%`,
                    }))
                  );
                  const clustersSheet = XLSX.utils.json_to_sheet(clusterRows);
                  XLSX.utils.book_append_sheet(workbook, clustersSheet, "Clusters");
                }

                XLSX.writeFile(
                  workbook,
                  `keywords-${keyword.replace(/\s+/g, "-")}-${new Date()
                    .toISOString()
                    .slice(0, 10)}.xlsx`
                );
              }}
              className="btn-secondary flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export Excel (.xlsx)
            </button>
          </div>
          {selectedProjectId && (
            <div className="panel p-4">
              <h3 className="font-heading text-base font-semibold text-foreground">Keyword Folder</h3>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <select
                  value={selectedFolderId}
                  onChange={(e) => setSelectedFolderId(e.target.value)}
                  className="rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-foreground"
                  aria-label="Select existing keyword folder"
                >
                  <option value="">No folder</option>
                  {projectFolders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {folder.name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Or create new folder (e.g. transactional)"
                  className="w-full py-2.5"
                  aria-label="Create new keyword folder"
                />
              </div>
              <p className="mt-2 text-xs text-zinc-500">
                If both are provided, the existing selected folder is used.
              </p>
            </div>
          )}
        <div className="panel mt-3 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[#1a1236]/90">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-cyan-100">
                    Keyword
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-cyan-100">
                    Volume
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-cyan-100">
                    Difficulty
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-cyan-100">
                    CPC
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-cyan-100">
                    Competition
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-cyan-100">
                    Intent
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-cyan-100">
                    Tags
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayedResults.map((row, i) => (
                  <tr
                    key={i}
                    className="border-b border-[var(--border)]/50 transition-colors hover:bg-[#1a1236]/55"
                  >
                    <td className="px-6 py-4">
                      <span className="font-medium text-foreground">{row.keyword}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-2 text-zinc-600">
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                        {row.volume.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={
                          row.difficulty > 70
                            ? "text-red-600"
                            : row.difficulty > 40
                              ? "text-amber-600"
                              : "text-emerald-600"
                        }
                      >
                        {row.difficulty}%
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-2 text-zinc-600">
                        <DollarSign className="h-4 w-4 text-zinc-400" />
                        {row.cpc.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                        <span className="text-zinc-600">
                        {((row.competition ?? 0) * 100).toFixed(0)}%
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {intentMap[row.keyword] ? (
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] capitalize ${getIntentColor(intentMap[row.keyword])}`}>
                          {intentMap[row.keyword]}
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-500">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex min-w-[220px] flex-wrap items-center gap-1.5">
                        {(tagMap[row.keyword] ?? []).map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => removeTag(row.keyword, tag)}
                            className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2 py-0.5 text-xs text-cyan-100"
                          >
                            {tag} ×
                          </button>
                        ))}
                        <input
                          value={tagDrafts[row.keyword] ?? ""}
                          onChange={(e) =>
                            setTagDrafts((prev) => ({
                              ...prev,
                              [row.keyword]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === ",") {
                              e.preventDefault();
                              addTag(row.keyword, tagDrafts[row.keyword] ?? "");
                            }
                          }}
                          placeholder="add tag"
                          className="h-8 min-w-[96px] rounded-lg border border-[var(--border)] bg-[#120b28] px-2 text-xs text-zinc-500"
                        />
                      </div>
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

function SuggestionCard({ title, items }: { title: string; items: KeywordResult[] }) {
  return (
    <div className="panel p-4">
      <h3 className="mb-3 font-heading text-base font-semibold text-foreground">{title}</h3>
      {items.length ? (
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <span key={item.keyword} className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2.5 py-1 text-xs text-cyan-100">
              {item.keyword}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-zinc-500">No suggestions yet for this input.</p>
      )}
    </div>
  );
}

function OverviewCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-2 font-heading text-2xl font-semibold text-foreground">{value}</p>
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

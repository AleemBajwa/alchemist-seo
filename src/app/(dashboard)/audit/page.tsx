"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { FileSearch, Loader2, AlertTriangle, Info, FileDown, Globe } from "lucide-react";

type AuditIssue = {
  type: "error" | "warning" | "info";
  category: string;
  message: string;
  details?: string;
};

type TechnicalSummary = {
  crawlSource: string;
  orphanPageUrls: string[];
  redirectChainExamples: string[];
  duplicateTitleGroups: Array<{ title: string; count: number; urls: string[] }>;
  duplicateMetaGroups: Array<{ meta: string; count: number; urls: string[] }>;
};

type AuditResult = {
  url: string;
  score: number;
  grade: string;
  issues: AuditIssue[];
  pagesAudited?: number;
  crawlType?: string;
  crawlSource?: string;
  technicalSummary?: TechnicalSummary;
  pageSpeed?: {
    mobile: {
      strategy: "mobile" | "desktop";
      performanceScore: number | null;
      lcpMs: number | null;
      cls: number | null;
      inpMs: number | null;
      fcpMs: number | null;
      speedIndexMs: number | null;
      isMobileFriendly: boolean | null;
    } | null;
    desktop: {
      strategy: "mobile" | "desktop";
      performanceScore: number | null;
      lcpMs: number | null;
      cls: number | null;
      inpMs: number | null;
      fcpMs: number | null;
      speedIndexMs: number | null;
      isMobileFriendly: boolean | null;
    } | null;
  };
};

function AuditContent() {
  const searchParams = useSearchParams();
  const urlParam = searchParams.get("url");
  const projectIdParam = searchParams.get("projectId");
  const [url, setUrl] = useState("");
  const [focusKeyword, setFocusKeyword] = useState("");
  const [projectId, setProjectId] = useState(projectIdParam || "");
  const [crawlType, setCrawlType] = useState<"single" | "fullsite">("single");
  const [maxPages, setMaxPages] = useState(25);

  useEffect(() => {
    if (urlParam) {
      try {
        const decoded = decodeURIComponent(urlParam);
        setUrl(decoded.startsWith("http") ? decoded : `https://${decoded}`);
      } catch {
        setUrl(urlParam);
      }
    }
  }, [urlParam]);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;

    let auditUrl = url.trim();
    if (!auditUrl.startsWith("http")) {
      auditUrl = `https://${auditUrl}`;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: auditUrl,
          projectId: projectId || undefined,
          focusKeyword: focusKeyword.trim() || undefined,
          crawlType,
          maxPages: crawlType === "fullsite" ? maxPages : undefined,
        }),
      });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error?.[0]?.message || "Audit failed");
      }
      setResult(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case "A":
        return "text-emerald-600 bg-emerald-100";
      case "B":
        return "text-blue-600 bg-blue-100";
      case "C":
        return "text-amber-600 bg-amber-100";
      case "D":
        return "text-orange-600 bg-orange-100";
      default:
        return "text-red-600 bg-red-100";
    }
  };

  const getIssueIcon = (type: string) => {
    switch (type) {
      case "error":
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-heading text-4xl font-semibold tracking-tight text-foreground">
          Site Audit
        </h1>
        <p className="mt-2 text-lg text-zinc-500">
          Comprehensive SEO audit: single page or full-site crawl via sitemap. Checks titles, meta, Core Web Vitals, mobile, images, redirects, orphan pages, duplicates, and internal linking.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setCrawlType("single")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
              crawlType === "single"
                ? "bg-[var(--accent)] text-white"
                : "border border-[var(--border)] bg-white text-zinc-500 hover:bg-zinc-50"
            }`}
          >
            <FileSearch className="h-4 w-4" />
            Single page
          </button>
          <button
            type="button"
            onClick={() => setCrawlType("fullsite")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
              crawlType === "fullsite"
                ? "bg-[var(--accent)] text-white"
                : "border border-[var(--border)] bg-white text-zinc-500 hover:bg-zinc-50"
            }`}
          >
            <Globe className="h-4 w-4" />
            Full site (sitemap)
          </button>
        </div>
        <div className="flex gap-4">
        <div className="relative flex-1">
          <FileSearch className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com or example.com"
            className="w-full py-3 pl-12 pr-4 disabled:opacity-50"
            disabled={loading}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-3 font-medium text-white transition-colors hover:bg-[var(--accent-muted)] disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Auditing...
            </>
          ) : (
            <>
              <FileSearch className="h-5 w-5" />
              Audit
            </>
          )}
        </button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="relative">
            <input
              type="text"
              value={focusKeyword}
              onChange={(e) => setFocusKeyword(e.target.value)}
              placeholder="Optional focus keyword for presence checks"
              className="w-full py-2.5 px-4 disabled:opacity-50"
              disabled={loading}
            />
          </div>
          {crawlType === "fullsite" && (
            <div className="relative">
              <input
                type="number"
                min={1}
                max={100}
                value={maxPages}
                onChange={(e) => setMaxPages(Math.max(1, Math.min(100, Number(e.target.value) || 25)))}
                placeholder="Max pages to crawl"
                className="w-full py-2.5 px-4 disabled:opacity-50"
                disabled={loading}
              />
              <p className="mt-1 text-xs text-zinc-500">Maximum pages to audit (1-100)</p>
            </div>
          )}
        </div>
      </form>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-sm)]">
            <div
              className={`flex h-24 w-24 items-center justify-center rounded-2xl font-heading text-4xl font-bold ${getGradeColor(result.grade)}`}
            >
              {result.grade}
            </div>
            <div>
              <h2 className="font-heading text-xl font-semibold text-foreground">
                SEO Score: {result.score}/100
              </h2>
              <p className="mt-1 text-sm text-zinc-500">{result.url}</p>
              <p className="mt-2 text-sm text-zinc-400">
                {result.issues.length} issue{result.issues.length !== 1 ? "s" : ""} found
                {result.pagesAudited && result.pagesAudited > 1 && (
                  <span> • {result.pagesAudited} pages audited</span>
                )}
                {result.crawlSource && result.pagesAudited && result.pagesAudited > 1 && (
                  <span> • Crawl: {result.crawlSource === "sitemap" ? "sitemap" : "link discovery"}</span>
                )}
              </p>
            </div>
            <button
              onClick={async () => {
                setPdfLoading(true);
                try {
                  const res = await fetch("/api/audit/pdf", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      url: result.url,
                      score: result.score,
                      grade: result.grade,
                      issues: result.issues,
                      pagesAudited: result.pagesAudited ?? 1,
                      technicalSummary: result.technicalSummary,
                    }),
                  });
                  const blob = await res.blob();
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(blob);
                  a.download = `seo-audit-${Date.now()}.pdf`;
                  a.click();
                  URL.revokeObjectURL(a.href);
                } finally {
                  setPdfLoading(false);
                }
              }}
              disabled={pdfLoading}
              className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-zinc-50 disabled:opacity-50"
            >
              {pdfLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4" />
              )}
              Export PDF
            </button>
          </div>

          {result.technicalSummary && (
            <div className="space-y-4">
              <h3 className="font-heading text-lg font-semibold text-foreground">Technical & crawl summary</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="panel p-4">
                  <h4 className="text-sm font-semibold text-cyan-200">Crawl source</h4>
                  <p className="mt-1 text-sm text-zinc-400">
                    {result.technicalSummary.crawlSource === "sitemap"
                      ? "URLs discovered via sitemap.xml"
                      : "URLs discovered via link crawling (no sitemap found)"}
                  </p>
                </div>
                {result.technicalSummary.orphanPageUrls.length > 0 && (
                  <div className="panel p-4">
                    <h4 className="text-sm font-semibold text-amber-200">Orphan pages ({result.technicalSummary.orphanPageUrls.length})</h4>
                    <p className="mt-1 text-xs text-zinc-500">Pages not linked from any other audited page</p>
                    <ul className="mt-2 max-h-32 overflow-y-auto space-y-1 text-xs text-zinc-400">
                      {result.technicalSummary.orphanPageUrls.slice(0, 15).map((u) => (
                        <li key={u} className="truncate" title={u}>{u}</li>
                      ))}
                      {result.technicalSummary.orphanPageUrls.length > 15 && (
                        <li className="text-zinc-500">+{result.technicalSummary.orphanPageUrls.length - 15} more</li>
                      )}
                    </ul>
                  </div>
                )}
                {result.technicalSummary.redirectChainExamples.length > 0 && (
                  <div className="panel p-4 md:col-span-2">
                    <h4 className="text-sm font-semibold text-amber-200">Redirect chain examples</h4>
                    <ul className="mt-2 space-y-2 text-xs text-zinc-400">
                      {result.technicalSummary.redirectChainExamples.map((chain, i) => (
                        <li key={i} className="font-mono truncate" title={chain}>{chain}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {result.technicalSummary.duplicateTitleGroups.length > 0 && (
                  <div className="panel p-4">
                    <h4 className="text-sm font-semibold text-amber-200">Duplicate title tags</h4>
                    <p className="mt-1 text-xs text-zinc-500">Same title used on multiple URLs</p>
                    <ul className="mt-2 space-y-2 text-xs">
                      {result.technicalSummary.duplicateTitleGroups.slice(0, 5).map((g, i) => (
                        <li key={i}>
                          <span className="text-foreground font-medium">"{g.title.slice(0, 50)}{g.title.length > 50 ? "…" : ""}"</span>
                          <span className="text-zinc-500"> — {g.count} URLs</span>
                        </li>
                      ))}
                      {result.technicalSummary.duplicateTitleGroups.length > 5 && (
                        <li className="text-zinc-500">+{result.technicalSummary.duplicateTitleGroups.length - 5} more groups</li>
                      )}
                    </ul>
                  </div>
                )}
                {result.technicalSummary.duplicateMetaGroups.length > 0 && (
                  <div className="panel p-4">
                    <h4 className="text-sm font-semibold text-amber-200">Duplicate meta descriptions</h4>
                    <p className="mt-1 text-xs text-zinc-500">Same description on multiple URLs</p>
                    <ul className="mt-2 space-y-2 text-xs">
                      {result.technicalSummary.duplicateMetaGroups.slice(0, 5).map((g, i) => (
                        <li key={i}>
                          <span className="text-foreground">"{g.meta.slice(0, 40)}{g.meta.length > 40 ? "…" : ""}"</span>
                          <span className="text-zinc-500"> — {g.count} URLs</span>
                        </li>
                      ))}
                      {result.technicalSummary.duplicateMetaGroups.length > 5 && (
                        <li className="text-zinc-500">+{result.technicalSummary.duplicateMetaGroups.length - 5} more groups</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {result.pageSpeed && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="panel p-4">
                <h3 className="font-heading text-base font-semibold text-foreground">Core Web Vitals (Mobile)</h3>
                {result.pageSpeed.mobile ? (
                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-zinc-500">
                    <p>Performance: <span className="text-foreground">{result.pageSpeed.mobile.performanceScore ?? "-"} / 100</span></p>
                    <p>Mobile Friendly: <span className="text-foreground">{result.pageSpeed.mobile.isMobileFriendly == null ? "-" : result.pageSpeed.mobile.isMobileFriendly ? "Yes" : "No"}</span></p>
                    <p>LCP: <span className="text-foreground">{result.pageSpeed.mobile.lcpMs != null ? `${Math.round(result.pageSpeed.mobile.lcpMs)}ms` : "-"}</span></p>
                    <p>INP/FID: <span className="text-foreground">{result.pageSpeed.mobile.inpMs != null ? `${Math.round(result.pageSpeed.mobile.inpMs)}ms` : "-"}</span></p>
                    <p>CLS: <span className="text-foreground">{result.pageSpeed.mobile.cls != null ? result.pageSpeed.mobile.cls.toFixed(3) : "-"}</span></p>
                    <p>FCP: <span className="text-foreground">{result.pageSpeed.mobile.fcpMs != null ? `${Math.round(result.pageSpeed.mobile.fcpMs)}ms` : "-"}</span></p>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-zinc-500">No mobile PageSpeed metrics available.</p>
                )}
              </div>
              <div className="panel p-4">
                <h3 className="font-heading text-base font-semibold text-foreground">Performance (Desktop)</h3>
                {result.pageSpeed.desktop ? (
                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-zinc-500">
                    <p>Performance: <span className="text-foreground">{result.pageSpeed.desktop.performanceScore ?? "-"} / 100</span></p>
                    <p>Speed Index: <span className="text-foreground">{result.pageSpeed.desktop.speedIndexMs != null ? `${Math.round(result.pageSpeed.desktop.speedIndexMs)}ms` : "-"}</span></p>
                    <p>LCP: <span className="text-foreground">{result.pageSpeed.desktop.lcpMs != null ? `${Math.round(result.pageSpeed.desktop.lcpMs)}ms` : "-"}</span></p>
                    <p>INP/FID: <span className="text-foreground">{result.pageSpeed.desktop.inpMs != null ? `${Math.round(result.pageSpeed.desktop.inpMs)}ms` : "-"}</span></p>
                    <p>CLS: <span className="text-foreground">{result.pageSpeed.desktop.cls != null ? result.pageSpeed.desktop.cls.toFixed(3) : "-"}</span></p>
                    <p>FCP: <span className="text-foreground">{result.pageSpeed.desktop.fcpMs != null ? `${Math.round(result.pageSpeed.desktop.fcpMs)}ms` : "-"}</span></p>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-zinc-500">No desktop PageSpeed metrics available.</p>
                )}
              </div>
            </div>
          )}

          <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-sm)]">
            <h3 className="border-b border-[var(--border)] px-6 py-4 font-heading text-lg font-semibold text-foreground">
              Issues
            </h3>
            <div className="divide-y divide-[var(--border)]">
              {result.issues.map((issue, i) => (
                <div
                  key={i}
                  className="flex gap-4 px-6 py-4 transition-colors hover:bg-zinc-50/50"
                >
                  <div className="shrink-0">{getIssueIcon(issue.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {issue.message}
                      </span>
                      <span className="rounded-lg bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
                        {issue.category}
                      </span>
                    </div>
                    {issue.details && (
                      <p className="mt-1 text-sm text-zinc-500">{issue.details}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AuditPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-zinc-500" /></div>}>
      <AuditContent />
    </Suspense>
  );
}

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

type AuditResult = {
  url: string;
  score: number;
  grade: string;
  issues: AuditIssue[];
  pagesAudited?: number;
  crawlType?: string;
};

function AuditContent() {
  const searchParams = useSearchParams();
  const urlParam = searchParams.get("url");
  const projectIdParam = searchParams.get("projectId");
  const [url, setUrl] = useState("");
  const [projectId, setProjectId] = useState(projectIdParam || "");
  const [crawlType, setCrawlType] = useState<"single" | "fullsite">("single");

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
          crawlType,
          maxPages: 25,
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
        return "text-emerald-400 bg-emerald-400/20";
      case "B":
        return "text-blue-400 bg-blue-400/20";
      case "C":
        return "text-amber-400 bg-amber-400/20";
      case "D":
        return "text-orange-400 bg-orange-400/20";
      default:
        return "text-red-400 bg-red-400/20";
    }
  };

  const getIssueIcon = (type: string) => {
    switch (type) {
      case "error":
        return <AlertTriangle className="h-5 w-5 text-red-400" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-amber-400" />;
      default:
        return <Info className="h-5 w-5 text-blue-400" />;
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-100">
          Site Audit
        </h1>
        <p className="mt-1 text-zinc-500">
          Crawl any URL and get instant SEO recommendations. Checks titles, meta, mobile, and more.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setCrawlType("single")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              crawlType === "single"
                ? "bg-[var(--accent)] text-white"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            <FileSearch className="h-4 w-4" />
            Single page
          </button>
          <button
            type="button"
            onClick={() => setCrawlType("fullsite")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              crawlType === "fullsite"
                ? "bg-[var(--accent)] text-white"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
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
      </form>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-400">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-6 rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
            <div
              className={`flex h-24 w-24 items-center justify-center rounded-2xl text-4xl font-bold ${getGradeColor(result.grade)}`}
            >
              {result.grade}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-zinc-100">
                SEO Score: {result.score}/100
              </h2>
              <p className="mt-1 text-sm text-zinc-500">{result.url}</p>
              <p className="mt-2 text-sm text-zinc-400">
                {result.issues.length} issue{result.issues.length !== 1 ? "s" : ""} found
                {result.pagesAudited && result.pagesAudited > 1 && (
                  <span> • {result.pagesAudited} pages audited</span>
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
              className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-700 disabled:opacity-50"
            >
              {pdfLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4" />
              )}
              Export PDF
            </button>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
            <h3 className="border-b border-[var(--border)] px-6 py-4 font-semibold text-zinc-100">
              Issues
            </h3>
            <div className="divide-y divide-[var(--border)]">
              {result.issues.map((issue, i) => (
                <div
                  key={i}
                  className="flex gap-4 px-6 py-4 hover:bg-white/5"
                >
                  <div className="shrink-0">{getIssueIcon(issue.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-zinc-100">
                        {issue.message}
                      </span>
                      <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-500">
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

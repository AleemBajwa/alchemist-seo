"use client";

import { useState } from "react";
import { Loader2, Sparkles, Wand2, FileText, Gauge, BookOpen } from "lucide-react";

type BriefData = {
  pillarTitle: string;
  pillarKeyword: string;
  pillarBrief: string;
  pillarH2s: string[];
  clusters: Array<{ title: string; keyword: string; brief: string; h2s: string[] }>;
  generationSource?: string;
};

type Generated = {
  keyword: string;
  tone: string;
  language: string;
  targetWords: number;
  titleOptions: string[];
  metaDescription: string;
  headingStructure: { h1: string; h2: string[]; h3: string[] };
  article: string;
  faq: { q: string; a: string }[];
  seoScore: number;
  readability: number;
  keywordDensity: number;
  nlpSuggestions: string[];
  competitorAnalysis: {
    competitorUrl: string | null;
    topTerms: string[];
    contentGaps: string[];
    gapScore?: number;
    topicCoveragePct?: number | null;
    weightedCoveragePct?: number | null;
    wordCountComparison?: { article: number; competitor: number };
    headingThemes?: string[];
  };
  metaTags: {
    title: string;
    description: string;
    openGraph: { title: string; description: string; type: string; locale: string };
  };
  schemaJsonLd: Record<string, unknown>;
  generationSource?: "llm" | "fallback";
  generationModel?: string | null;
};

export default function ContentGeneratorPage() {
  const [activeMode, setActiveMode] = useState<"generate" | "brief">("generate");
  const [briefTopic, setBriefTopic] = useState("");
  const [briefClusterCount, setBriefClusterCount] = useState(6);
  const [briefLoading, setBriefLoading] = useState(false);
  const [briefError, setBriefError] = useState<string | null>(null);
  const [briefResult, setBriefResult] = useState<BriefData | null>(null);
  const [keyword, setKeyword] = useState("");
  const [tone, setTone] = useState("professional");
  const [language, setLanguage] = useState("en");
  const [targetWords, setTargetWords] = useState(1200);
  const [includeFaq, setIncludeFaq] = useState(true);
  const [competitorUrl, setCompetitorUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Generated | null>(null);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!keyword.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/content/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: keyword.trim(),
          tone,
          language,
          targetWords,
          includeFaq,
          competitorUrl: competitorUrl.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Generation failed");
      setResult(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleBrief(e: React.FormEvent) {
    e.preventDefault();
    if (!briefTopic.trim()) return;
    setBriefLoading(true);
    setBriefError(null);
    setBriefResult(null);
    try {
      const res = await fetch("/api/content/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: briefTopic.trim(), clusterCount: briefClusterCount }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Brief generation failed");
      setBriefResult(data.data);
    } catch (err) {
      setBriefError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBriefLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="hero-shell p-5 md:p-6">
        <span className="hero-kicker">AI Content</span>
        <h1 className="hero-title mt-3">Content Generator & Briefs</h1>
        <p className="mt-2 max-w-3xl text-[1rem] text-zinc-600">
          Generate SEO content from keywords or create pillar-cluster content briefs from any topic.
        </p>
      </div>

      <div className="flex gap-2 border-b border-[var(--border)]">
        <button
          type="button"
          onClick={() => setActiveMode("generate")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium ${
            activeMode === "generate"
              ? "border-[var(--accent)] text-[var(--accent)]"
              : "border-transparent text-zinc-500 hover:text-zinc-200"
          }`}
        >
          <Sparkles className="h-4 w-4" />
          Content Generator
        </button>
        <button
          type="button"
          onClick={() => setActiveMode("brief")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium ${
            activeMode === "brief"
              ? "border-[var(--accent)] text-[var(--accent)]"
              : "border-transparent text-zinc-500 hover:text-zinc-200"
          }`}
        >
          <BookOpen className="h-4 w-4" />
          Content Briefs
        </button>
      </div>

      {activeMode === "brief" && (
        <>
          <form onSubmit={handleBrief} className="panel p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="brief-topic" className="mb-1 block text-sm font-medium text-zinc-500">Topic</label>
                <input
                  id="brief-topic"
                  value={briefTopic}
                  onChange={(e) => setBriefTopic(e.target.value)}
                  placeholder="e.g. email marketing automation"
                  className="w-full"
                />
              </div>
              <div>
                <label htmlFor="brief-clusters" className="mb-1 block text-sm font-medium text-zinc-500">Cluster count</label>
                <input
                  id="brief-clusters"
                  type="number"
                  min={2}
                  max={12}
                  value={briefClusterCount}
                  onChange={(e) => setBriefClusterCount(Number(e.target.value) || 6)}
                  className="w-full"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={briefLoading}
              className="btn-primary mt-4 inline-flex items-center gap-2 disabled:opacity-50"
            >
              {briefLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" />}
              {briefLoading ? "Generating..." : "Generate Brief"}
            </button>
          </form>
          {briefError && (
            <div className="rounded-xl border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-200">{briefError}</div>
          )}
          {briefResult && (
            <div className="space-y-4">
              <div className="panel p-4">
                <p className="text-xs text-zinc-500 mb-1">Source: {briefResult.generationSource === "llm" ? "LLM" : "Fallback"}</p>
                <h3 className="font-heading text-lg font-semibold text-foreground">Pillar Page</h3>
                <p className="mt-2 font-medium text-foreground">{briefResult.pillarTitle}</p>
                <p className="mt-2 text-sm text-zinc-500">{briefResult.pillarBrief}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {briefResult.pillarH2s.map((h) => (
                    <span key={h} className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2 py-1 text-xs text-cyan-100">{h}</span>
                  ))}
                </div>
              </div>
              <div className="panel p-4">
                <h3 className="font-heading text-lg font-semibold text-foreground">Cluster Articles</h3>
                <div className="mt-4 space-y-4">
                  {briefResult.clusters.map((c, i) => (
                    <div key={i} className="rounded-xl border border-[var(--border)] bg-[#120b28] p-4">
                      <p className="font-semibold text-foreground">{c.title}</p>
                      <p className="mt-1 text-sm text-zinc-500">{c.brief}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {c.h2s.map((h) => (
                          <span key={h} className="rounded border border-fuchsia-400/30 bg-fuchsia-500/10 px-2 py-0.5 text-xs text-fuchsia-100">{h}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {activeMode === "generate" && (
      <>
      <form onSubmit={handleGenerate} className="panel p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="content-keyword" className="mb-1 block text-sm font-medium text-zinc-500">Primary keyword</label>
            <input id="content-keyword" aria-label="Primary keyword" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="e.g. ai seo tools" className="w-full" />
          </div>
          <div>
            <label htmlFor="content-competitor-url" className="mb-1 block text-sm font-medium text-zinc-500">Competitor URL (optional)</label>
            <input id="content-competitor-url" aria-label="Competitor URL" value={competitorUrl} onChange={(e) => setCompetitorUrl(e.target.value)} placeholder="https://competitor.com/page" className="w-full" />
          </div>
          <div>
            <label htmlFor="content-tone" className="mb-1 block text-sm font-medium text-zinc-500">Tone</label>
            <select id="content-tone" aria-label="Tone" value={tone} onChange={(e) => setTone(e.target.value)} className="w-full">
              <option value="professional">Professional</option>
              <option value="casual">Casual</option>
              <option value="sales">Sales</option>
            </select>
          </div>
          <div>
            <label htmlFor="content-language" className="mb-1 block text-sm font-medium text-zinc-500">Language</label>
            <select id="content-language" aria-label="Language" value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full">
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="de">German</option>
              <option value="fr">French</option>
              <option value="it">Italian</option>
            </select>
          </div>
          <div>
            <label htmlFor="content-target-words" className="mb-1 block text-sm font-medium text-zinc-500">Target words</label>
            <input id="content-target-words" aria-label="Target words" type="number" min={300} max={5000} value={targetWords} onChange={(e) => setTargetWords(Number(e.target.value) || 1200)} className="w-full" />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm text-zinc-500">
              <input aria-label="Include FAQ section" type="checkbox" checked={includeFaq} onChange={(e) => setIncludeFaq(e.target.checked)} />
              Include FAQ section
            </label>
          </div>
        </div>
        <button type="submit" disabled={loading} className="btn-primary mt-4 inline-flex items-center gap-2 disabled:opacity-50">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loading ? "Generating..." : "Generate Content"}
        </button>
      </form>

      {error && <div className="rounded-xl border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}

      {result && (
        <div className="space-y-4">
          <div className="panel p-3">
            <p className="text-sm text-zinc-500">
              Generation mode:{" "}
              <span className="font-medium text-foreground">
                {result.generationSource === "llm" ? `LLM${result.generationModel ? ` (${result.generationModel})` : ""}` : "Fallback template"}
              </span>
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="panel p-4">
              <div className="mb-2 flex items-center gap-2 text-cyan-200"><Gauge className="h-4 w-4" /> SEO Score</div>
              <p className="font-heading text-3xl font-semibold text-foreground">{result.seoScore}/100</p>
            </div>
            <div className="panel p-4">
              <div className="mb-2 flex items-center gap-2 text-cyan-200"><FileText className="h-4 w-4" /> Readability</div>
              <p className="font-heading text-3xl font-semibold text-foreground">{result.readability}/100</p>
            </div>
            <div className="panel p-4">
              <div className="mb-2 flex items-center gap-2 text-cyan-200"><Wand2 className="h-4 w-4" /> Keyword Density</div>
              <p className="font-heading text-3xl font-semibold text-foreground">{result.keywordDensity}%</p>
            </div>
          </div>

          <div className="panel p-4">
            <h3 className="font-heading text-lg font-semibold text-foreground">SEO Titles</h3>
            <ul className="mt-2 space-y-1 text-sm text-zinc-500">
              {result.titleOptions.map((t) => <li key={t}>- {t}</li>)}
            </ul>
            <p className="mt-3 text-sm text-zinc-500"><strong>Meta Description:</strong> {result.metaDescription}</p>
          </div>

          <div className="panel p-4">
            <h3 className="font-heading text-lg font-semibold text-foreground">Heading Structure</h3>
            <p className="mt-2 text-sm text-zinc-500"><strong>H1:</strong> {result.headingStructure.h1}</p>
            <p className="mt-2 text-sm text-zinc-500"><strong>H2:</strong> {result.headingStructure.h2.join(" | ")}</p>
            <p className="mt-2 text-sm text-zinc-500"><strong>H3:</strong> {result.headingStructure.h3.join(" | ")}</p>
          </div>

          <div className="panel p-4">
            <h3 className="font-heading text-lg font-semibold text-foreground">Long-form Article</h3>
            <textarea aria-label="Generated article" value={result.article} readOnly className="mt-2 min-h-72 w-full rounded-xl border border-[var(--border)] bg-[#120b28] p-3 text-sm text-zinc-500" />
          </div>

          {result.faq.length > 0 && (
            <div className="panel p-4">
              <h3 className="font-heading text-lg font-semibold text-foreground">FAQ</h3>
              <div className="mt-2 space-y-2">
                {result.faq.map((f) => (
                  <div key={f.q} className="rounded-xl border border-[var(--border)] bg-[#120b28] p-3">
                    <p className="text-sm font-semibold text-foreground">{f.q}</p>
                    <p className="mt-1 text-sm text-zinc-500">{f.a}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="panel p-4">
              <h3 className="font-heading text-lg font-semibold text-foreground">NLP Suggestions</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {result.nlpSuggestions.map((term) => (
                  <span key={term} className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2 py-1 text-xs text-cyan-100">{term}</span>
                ))}
              </div>
            </div>
            <div className="panel p-4">
              <h3 className="font-heading text-lg font-semibold text-foreground">Content Gap</h3>
              {result.competitorAnalysis.gapScore != null && (
                <div className="mb-2 grid grid-cols-2 gap-2 text-xs text-zinc-500">
                  <p>Gap score: <span className="text-foreground">{result.competitorAnalysis.gapScore}/100</span></p>
                  <p>Topic coverage: <span className="text-foreground">{result.competitorAnalysis.topicCoveragePct ?? "-"}%</span></p>
                  <p>Weighted coverage: <span className="text-foreground">{result.competitorAnalysis.weightedCoveragePct ?? "-"}%</span></p>
                  <p>
                    Word depth:{" "}
                    <span className="text-foreground">
                      {result.competitorAnalysis.wordCountComparison?.article ?? 0}/
                      {result.competitorAnalysis.wordCountComparison?.competitor ?? 0}
                    </span>
                  </p>
                </div>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                {result.competitorAnalysis.contentGaps.map((term) => (
                  <span key={term} className="rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-2 py-1 text-xs text-fuchsia-100">{term}</span>
                ))}
              </div>
              {!!result.competitorAnalysis.headingThemes?.length && (
                <div className="mt-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Competitor heading themes</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {result.competitorAnalysis.headingThemes.slice(0, 6).map((heading) => (
                      <span key={heading} className="rounded-full border border-amber-300/30 bg-amber-500/10 px-2 py-1 text-xs text-amber-100">
                        {heading}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="panel p-4">
            <h3 className="font-heading text-lg font-semibold text-foreground">Schema (JSON-LD)</h3>
            <pre className="mt-2 overflow-x-auto rounded-xl border border-[var(--border)] bg-[#120b28] p-3 text-xs text-zinc-500">
              {JSON.stringify(result.schemaJsonLd, null, 2)}
            </pre>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";

const schema = z.object({
  keyword: z.string().min(2).max(200),
  tone: z.enum(["professional", "casual", "sales"]).default("professional"),
  language: z.enum(["en", "es", "de", "fr", "it"]).default("en"),
  targetWords: z.number().min(300).max(5000).default(1200),
  includeFaq: z.boolean().default(true),
  competitorUrl: z.string().url().optional(),
});

function pickToneStyle(tone: "professional" | "casual" | "sales") {
  if (tone === "casual") return "clear, friendly, conversational";
  if (tone === "sales") return "persuasive, conversion-focused, benefit-led";
  return "authoritative, concise, and professional";
}

function monthIsoLabel() {
  return new Date().toISOString().slice(0, 10);
}

function extractVisibleText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function topTerms(text: string, minLength = 4, limit = 20) {
  const stopwords = new Set([
    "this", "that", "with", "from", "your", "have", "will", "about", "into", "they", "them", "their",
    "were", "been", "being", "what", "when", "where", "which", "while", "because", "there", "those",
    "these", "also", "then", "than", "over", "under", "very", "more", "most", "only", "some", "many",
  ]);
  const counts = new Map<string, number>();
  for (const raw of text.toLowerCase().split(/[^a-z0-9]+/)) {
    if (!raw || raw.length < minLength || stopwords.has(raw)) continue;
    counts.set(raw, (counts.get(raw) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([term]) => term);
}

function topTermEntries(text: string, minLength = 4, limit = 20) {
  const stopwords = new Set([
    "this", "that", "with", "from", "your", "have", "will", "about", "into", "they", "them", "their",
    "were", "been", "being", "what", "when", "where", "which", "while", "because", "there", "those",
    "these", "also", "then", "than", "over", "under", "very", "more", "most", "only", "some", "many",
  ]);
  const counts = new Map<string, number>();
  for (const raw of text.toLowerCase().split(/[^a-z0-9]+/)) {
    if (!raw || raw.length < minLength || stopwords.has(raw)) continue;
    counts.set(raw, (counts.get(raw) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([term, count]) => ({ term, count }));
}

function countWords(text: string) {
  return text.split(/\s+/).filter(Boolean).length;
}

function extractHeadings(html: string) {
  const headings = [...html.matchAll(/<(h1|h2|h3)[^>]*>([\s\S]*?)<\/\1>/gi)]
    .map((m) => (m[2] ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean);
  return headings.slice(0, 30);
}

function readabilityScore(text: string) {
  const sentences = Math.max(1, text.split(/[.!?]+/).filter(Boolean).length);
  const words = Math.max(1, text.split(/\s+/).filter(Boolean).length);
  const syllables = text
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .reduce((acc, w) => {
      const m = w.match(/[aeiouy]+/g);
      return acc + Math.max(1, m ? m.length : 1);
    }, 0);
  const flesch = 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words);
  return Math.max(0, Math.min(100, Math.round(flesch)));
}

function keywordDensity(text: string, keyword: string) {
  const normalized = text.toLowerCase();
  const target = keyword.toLowerCase().trim();
  const words = Math.max(1, normalized.split(/\s+/).filter(Boolean).length);
  const matches = normalized.split(target).length - 1;
  return Number(((matches / words) * 100).toFixed(2));
}

function buildParagraphs(keyword: string, tone: string, targetWords: number) {
  const style = pickToneStyle(tone as "professional" | "casual" | "sales");
  const blocks: string[] = [];
  const seed = [
    `This guide explains how to improve outcomes for "${keyword}" using a ${style} framework focused on search intent, technical stability, and measurable business impact.`,
    `Start by mapping the keyword to user intent, then align page structure, content depth, and internal linking so the page clearly answers the searcher's primary need.`,
    `Build topical authority by covering related subtopics, practical examples, and clear next steps. This helps both users and search engines trust the page.`,
    `On-page optimization should include strong title tags, compelling meta descriptions, semantic headings, and natural keyword placement without stuffing.`,
    `Track performance weekly: rankings, clicks, CTR, and conversion outcomes. Use the data to refresh sections that underperform and expand sections with high engagement.`,
  ];
  while (blocks.join(" ").split(/\s+/).length < targetWords) {
    blocks.push(seed[blocks.length % seed.length]);
  }
  return blocks.slice(0, Math.max(4, Math.ceil(targetWords / 120)));
}

type GeneratedShape = {
  titleOptions: string[];
  metaDescription: string;
  headingStructure: { h1: string; h2: string[]; h3: string[] };
  article: string;
  faq: { q: string; a: string }[];
};

function languageLabel(language: "en" | "es" | "de" | "fr" | "it") {
  if (language === "es") return "Spanish";
  if (language === "de") return "German";
  if (language === "fr") return "French";
  if (language === "it") return "Italian";
  return "English";
}

function buildFallbackContent(input: {
  keyword: string;
  tone: "professional" | "casual" | "sales";
  targetWords: number;
  includeFaq: boolean;
}): GeneratedShape {
  const { keyword, tone, targetWords, includeFaq } = input;
  const titleOptions = [
    `${keyword}: Complete ${new Date().getFullYear()} Strategy Guide`,
    `How to Win With ${keyword} (Step-by-Step Blueprint)`,
    `${keyword} Best Practices: Practical Framework for Growth`,
  ];
  const metaDescription = `Improve results for ${keyword} with a ${tone} SEO strategy, content structure, and optimization checklist built for measurable growth.`;
  const h1 = titleOptions[0];
  const h2 = [
    `What ${keyword} Means for Search Intent`,
    `On-Page Optimization Framework`,
    `Content Structure and Heading Blueprint`,
    `Internal Linking and Technical Signals`,
    `How to Measure SEO Performance`,
  ];
  const h3 = [
    "Title and Meta Description Checklist",
    "Keyword Placement Without Stuffing",
    "Readability and User Engagement Tactics",
    "Updating Content Based on SERP Changes",
  ];
  const paragraphs = buildParagraphs(keyword, tone, targetWords);
  const article = paragraphs.join("\n\n");
  const faq = includeFaq
    ? [
        {
          q: `How long does ${keyword} SEO take?`,
          a: "Early movement may appear in weeks, while durable gains usually require consistent optimization across several months.",
        },
        {
          q: "How often should content be updated?",
          a: "Review monthly and refresh sections when rankings, CTR, or conversion performance declines.",
        },
        {
          q: "What should be measured first?",
          a: "Track impressions, clicks, average position, and conversion impact together to avoid vanity-only decisions.",
        },
      ]
    : [];
  return {
    titleOptions,
    metaDescription,
    headingStructure: { h1, h2, h3 },
    article,
    faq,
  };
}

function tryParseJsonObject(raw: string): Record<string, unknown> | null {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
      } catch {
        return null;
      }
    }
    return null;
  }
}

function coerceArrayStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v) => typeof v === "string").map((v) => v.trim()).filter(Boolean);
}

function normalizeGeneratedFromLlm(
  candidate: Record<string, unknown> | null,
  fallback: GeneratedShape
): GeneratedShape {
  if (!candidate) return fallback;
  const heading = (candidate.headingStructure ?? {}) as Record<string, unknown>;
  const faqRaw = Array.isArray(candidate.faq) ? candidate.faq : [];
  const faq = faqRaw
    .map((entry) => {
      const obj = (entry ?? {}) as Record<string, unknown>;
      const q = typeof obj.q === "string" ? obj.q.trim() : "";
      const a = typeof obj.a === "string" ? obj.a.trim() : "";
      if (!q || !a) return null;
      return { q, a };
    })
    .filter((v): v is { q: string; a: string } => v !== null);

  const article =
    typeof candidate.article === "string" && candidate.article.trim()
      ? candidate.article.trim()
      : fallback.article;
  const titleOptions = coerceArrayStrings(candidate.titleOptions);

  return {
    titleOptions: titleOptions.length > 0 ? titleOptions.slice(0, 5) : fallback.titleOptions,
    metaDescription:
      typeof candidate.metaDescription === "string" && candidate.metaDescription.trim()
        ? candidate.metaDescription.trim()
        : fallback.metaDescription,
    headingStructure: {
      h1:
        typeof heading.h1 === "string" && heading.h1.trim()
          ? heading.h1.trim()
          : fallback.headingStructure.h1,
      h2: coerceArrayStrings(heading.h2).length
        ? coerceArrayStrings(heading.h2).slice(0, 8)
        : fallback.headingStructure.h2,
      h3: coerceArrayStrings(heading.h3).length
        ? coerceArrayStrings(heading.h3).slice(0, 10)
        : fallback.headingStructure.h3,
    },
    article,
    faq: faq.length ? faq.slice(0, 8) : fallback.faq,
  };
}

async function generateWithLlm(input: {
  keyword: string;
  tone: "professional" | "casual" | "sales";
  language: "en" | "es" | "de" | "fr" | "it";
  targetWords: number;
  includeFaq: boolean;
  competitorText: string;
  fallback: GeneratedShape;
}) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return { generated: input.fallback, source: "fallback" as const, model: null as string | null };
  }

  const baseUrl = (process.env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1").replace(/\/$/, "");
  const model =
    process.env.OPENAI_MODEL?.trim() ||
    process.env.AI_MODEL?.trim() ||
    "gpt-4o-mini";

  const prompt = [
    "You are an expert SEO content strategist and copywriter.",
    `Create production-quality content in ${languageLabel(input.language)}.`,
    `Primary keyword: ${input.keyword}`,
    `Tone: ${input.tone}`,
    `Target words for article body: ${input.targetWords} (stay within +/- 10%).`,
    input.includeFaq ? "Include FAQ with 3-6 high-quality Q&A entries." : "Set faq to an empty array.",
    input.competitorText
      ? `Competitor notes (summarized source text): ${input.competitorText.slice(0, 8000)}`
      : "No competitor notes provided.",
    "Return ONLY valid JSON with this shape:",
    `{
  "titleOptions": ["..."],
  "metaDescription": "...",
  "headingStructure": { "h1": "...", "h2": ["..."], "h3": ["..."] },
  "article": "...",
  "faq": [{"q":"...","a":"..."}]
}`,
  ].join("\n");

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.5,
      messages: [
        { role: "system", content: "Output strict JSON only. No markdown." },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!res.ok) {
    return { generated: input.fallback, source: "fallback" as const, model: null as string | null };
  }
  const json = await res.json();
  const rawContent = json?.choices?.[0]?.message?.content;
  const parsed = typeof rawContent === "string" ? tryParseJsonObject(rawContent) : null;
  const normalized = normalizeGeneratedFromLlm(parsed, input.fallback);
  return {
    generated: normalized,
    source: parsed ? ("llm" as const) : ("fallback" as const),
    model: parsed ? model : null,
  };
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const input = schema.parse(await request.json());
    const { keyword, tone, language, targetWords, includeFaq, competitorUrl } = input;

    let competitorText = "";
    let competitorHeadings: string[] = [];
    if (competitorUrl) {
      try {
        const r = await fetch(competitorUrl, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; AlChemistSEO/1.0)" },
        });
        const competitorHtml = await r.text();
        competitorText = extractVisibleText(competitorHtml).slice(0, 22000);
        competitorHeadings = extractHeadings(competitorHtml);
      } catch {
        competitorText = "";
        competitorHeadings = [];
      }
    }

    const fallback = buildFallbackContent({
      keyword,
      tone,
      targetWords,
      includeFaq,
    });
    const llm = await generateWithLlm({
      keyword,
      tone,
      language,
      targetWords,
      includeFaq,
      competitorText,
      fallback,
    });
    const generated = llm.generated;
    const titleOptions = generated.titleOptions;
    const metaDescription = generated.metaDescription;
    const h1 = generated.headingStructure.h1;
    const h2 = generated.headingStructure.h2;
    const h3 = generated.headingStructure.h3;
    const article = generated.article;
    const faq = generated.faq;

    const readability = readabilityScore(article);
    const density = keywordDensity(article, keyword);
    const competitorTermEntries = topTermEntries(competitorText, 4, 24);
    const competitorTerms = competitorTermEntries.map((e) => e.term);
    const articleTerms = new Set(topTerms(article, 4, 40));
    const contentGaps = competitorTermEntries
      .filter((entry) => !articleTerms.has(entry.term))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12)
      .map((entry) => entry.term);
    const nlpSuggestions = topTerms(`${article} ${competitorText}`, 5, 15).slice(0, 12);
    const articleWords = countWords(article);
    const competitorWords = countWords(competitorText);
    const overlapCount = competitorTerms.filter((term) => articleTerms.has(term)).length;
    const topicCoveragePct =
      competitorTerms.length > 0
        ? Math.round((overlapCount / competitorTerms.length) * 100)
        : null;
    const weightedGapLoss = competitorTermEntries
      .filter((entry) => !articleTerms.has(entry.term))
      .reduce((acc, entry) => acc + entry.count, 0);
    const weightedTotal = competitorTermEntries.reduce((acc, entry) => acc + entry.count, 0);
    const weightedCoveragePct =
      weightedTotal > 0
        ? Math.round(((weightedTotal - weightedGapLoss) / weightedTotal) * 100)
        : null;
    const gapScore = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          (topicCoveragePct ?? 70) * 0.4 +
            (weightedCoveragePct ?? 70) * 0.4 +
            Math.min(100, (articleWords / Math.max(1, competitorWords || articleWords)) * 100) * 0.2
        )
      )
    );
    const seoScore = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          50 +
            Math.min(20, density >= 0.6 && density <= 2.5 ? 20 : 8) +
            Math.min(15, readability >= 45 ? 15 : 7) +
            Math.min(15, nlpSuggestions.length)
        )
      )
    );

    const schemaJsonLd = {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: h1,
      datePublished: monthIsoLabel(),
      dateModified: monthIsoLabel(),
      inLanguage: language,
      description: metaDescription,
      keywords: [keyword, ...nlpSuggestions.slice(0, 6)].join(", "),
    };

    const openGraph = {
      title: h1,
      description: metaDescription,
      type: "article",
      locale: language,
    };

    return NextResponse.json({
      success: true,
      data: {
        keyword,
        tone,
        language,
        targetWords,
        titleOptions,
        metaDescription,
        headingStructure: { h1, h2, h3 },
        article,
        faq,
        seoScore,
        readability,
        keywordDensity: density,
        nlpSuggestions,
        competitorAnalysis: {
          competitorUrl: competitorUrl ?? null,
          topTerms: competitorTerms,
          contentGaps,
          gapScore,
          topicCoveragePct,
          weightedCoveragePct,
          wordCountComparison: {
            article: articleWords,
            competitor: competitorWords,
          },
          headingThemes: competitorHeadings.slice(0, 10),
        },
        metaTags: {
          title: h1,
          description: metaDescription,
          openGraph,
        },
        schemaJsonLd,
        generationSource: llm.source,
        generationModel: llm.model,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { success: false, error: "CONTENT_GENERATION_FAILED", message: error instanceof Error ? error.message : "Content generation failed" },
      { status: 500 }
    );
  }
}

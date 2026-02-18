import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

const schema = z.object({
  keyword: z.string().min(1).max(200).optional(),
  country: z.string().optional().default("us"),
  language: z.string().optional().default("en"),
  projectId: z.string().optional(),
  folderId: z.string().optional(),
  folderName: z.string().trim().min(1).max(80).optional(),
  saveKeywords: z
    .array(
      z.object({
        keyword: z.string(),
        volume: z.number().optional(),
        difficulty: z.number().optional(),
        cpc: z.number().optional(),
        competition: z.number().optional(),
      })
    )
    .optional(),
});

const COUNTRY_LOCATION_CODES: Record<string, number> = {
  us: 2840,
  uk: 2826,
  ca: 2124,
  au: 2036,
  in: 2356,
};

const LANGUAGE_CODES: Record<string, string> = {
  en: "en",
  es: "es",
  de: "de",
  fr: "fr",
  it: "it",
};

type KeywordRow = {
  keyword: string;
  volume: number;
  difficulty: number;
  cpc: number;
  competition: number;
  monthlySearches?: { year: number; month: number; search_volume: number }[];
};

const CLUSTER_STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "best",
  "by",
  "for",
  "from",
  "how",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "to",
  "what",
  "when",
  "where",
  "which",
  "who",
  "why",
  "with",
]);

function keywordTokens(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !CLUSTER_STOPWORDS.has(t));
}

function buildKeywordClusters(
  rows: Array<{ keyword: string; volume?: number; difficulty?: number }>,
  seedKeyword: string
) {
  const tokenFrequency = new Map<string, number>();
  const seedTokens = new Set(keywordTokens(seedKeyword));

  for (const row of rows) {
    const unique = [...new Set(keywordTokens(row.keyword))];
    for (const token of unique) {
      tokenFrequency.set(token, (tokenFrequency.get(token) ?? 0) + 1);
    }
  }

  const clusters = new Map<
    string,
    {
      label: string;
      keywords: Array<{ keyword: string; volume: number; difficulty: number }>;
      totalVolume: number;
      difficultyTotal: number;
    }
  >();

  for (const row of rows) {
    const tokens = keywordTokens(row.keyword);
    let clusterKey =
      tokens.find(
        (token) => (tokenFrequency.get(token) ?? 0) >= 2 && !seedTokens.has(token)
      ) ??
      tokens.find((token) => (tokenFrequency.get(token) ?? 0) >= 2) ??
      "core";

    if (!clusters.has(clusterKey)) {
      const label = clusterKey === "core" ? "Core Intent" : `${clusterKey} Cluster`;
      clusters.set(clusterKey, {
        label,
        keywords: [],
        totalVolume: 0,
        difficultyTotal: 0,
      });
    }
    const target = clusters.get(clusterKey)!;
    const volume = Number(row.volume) || 0;
    const difficulty = Number(row.difficulty) || 0;
    target.keywords.push({ keyword: row.keyword, volume, difficulty });
    target.totalVolume += volume;
    target.difficultyTotal += difficulty;
  }

  return [...clusters.values()]
    .map((cluster) => ({
      label: cluster.label,
      keywordCount: cluster.keywords.length,
      totalVolume: cluster.totalVolume,
      avgDifficulty: cluster.keywords.length
        ? Math.round(cluster.difficultyTotal / cluster.keywords.length)
        : 0,
      keywords: cluster.keywords
        .sort((a, b) => b.volume - a.volume)
        .slice(0, 12),
    }))
    .sort((a, b) => b.totalVolume - a.totalVolume);
}

function rankKeywordRows(rows: KeywordRow[]) {
  return [...rows].sort((a, b) => {
    const scoreA = a.volume * 0.65 + (100 - a.difficulty) * 0.25 + (a.competition * 100) * 0.1;
    const scoreB = b.volume * 0.65 + (100 - b.difficulty) * 0.25 + (b.competition * 100) * 0.1;
    return scoreB - scoreA;
  });
}

function buildServerSuggestionBuckets(rows: KeywordRow[], seedKeyword: string) {
  const seedTokens = new Set(keywordTokens(seedKeyword));
  const ranked = rankKeywordRows(rows);
  const longTail = ranked.filter((r) => r.keyword.trim().split(/\s+/).length >= 4).slice(0, 12);
  const questions = ranked
    .filter((r) => /^(how|what|why|when|where|which|who|can|is|are|does|do)\b/i.test(r.keyword))
    .slice(0, 12);
  const semantic = ranked
    .filter((r) => {
      const terms = keywordTokens(r.keyword);
      return terms.some((t) => !seedTokens.has(t));
    })
    .slice(0, 12);
  return { longTail, questions, semantic };
}

function buildDataForSeoAuthHeader({
  apiKey,
  login,
  password,
}: {
  apiKey?: string | null;
  login?: string | null;
  password?: string | null;
}) {
  const normalizedApiKey = apiKey?.trim();
  if (normalizedApiKey) {
    if (normalizedApiKey.startsWith("Basic ")) return normalizedApiKey;
    if (normalizedApiKey.includes(":")) {
      return `Basic ${Buffer.from(normalizedApiKey).toString("base64")}`;
    }
    return `Basic ${normalizedApiKey}`;
  }
  if (login && password) {
    return `Basic ${Buffer.from(`${login}:${password}`).toString("base64")}`;
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = schema.parse(body);
    const { keyword, projectId, folderId, folderName, saveKeywords, country, language } = parsed;

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    const authHeader = buildDataForSeoAuthHeader({
      apiKey: process.env.DATA_FOR_SEO_API_KEY ?? process.env.DATAFORSEO_API_KEY,
      login: process.env.DATA_FOR_SEO_LOGIN,
      password: process.env.DATA_FOR_SEO_PASSWORD,
    });

    if (!authHeader) {
      return NextResponse.json(
        {
          success: false,
          error: "API_KEYS_REQUIRED",
          message:
            "DataForSEO is not configured by the account owner yet. Please contact support.",
        },
        { status: 402 }
      );
    }

    let keywords: KeywordRow[] = (saveKeywords ?? []).map((k) => ({
      keyword: k.keyword,
      volume: Number(k.volume) || 0,
      difficulty: Number(k.difficulty) || 0,
      cpc: Number(k.cpc) || 0,
      competition: Number(k.competition) || 0,
    }));
    let serpAnalysis: Array<{
      rank: number;
      title: string;
      url: string;
      domain: string;
      estimatedTraffic: number | null;
      domainAuthority: number | null;
      backlinks: number | null;
    }> = [];
    if (!keywords.length && keyword) {
      const locationCode =
        COUNTRY_LOCATION_CODES[country.toLowerCase()] ??
        COUNTRY_LOCATION_CODES.us;
      const languageCode =
        LANGUAGE_CODES[language.toLowerCase()] ?? LANGUAGE_CODES.en;

      const dfsRes = await fetch("https://api.dataforseo.com/v3/dataforseo_labs/google/keyword_ideas/live", {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          {
            keywords: [keyword],
            location_code: locationCode,
            language_code: languageCode,
            include_serp_info: false,
            limit: 50,
          },
        ]),
      });

      const dfsJson = await dfsRes.json();
      if (!dfsRes.ok || dfsJson?.status_code >= 40000) {
        return NextResponse.json(
          {
            success: false,
            error: "API_ERROR",
            message: dfsJson?.status_message || "DataForSEO keyword request failed",
          },
          { status: 500 }
        );
      }

      const items =
        dfsJson?.tasks?.[0]?.result?.[0]?.items ??
        dfsJson?.tasks?.[0]?.result?.[0] ??
        [];

      keywords = (Array.isArray(items) ? items : []).map((item: any) => {
        const volume =
          item?.keyword_info?.search_volume ??
          item?.search_volume ??
          0;
        const competition =
          item?.keyword_info?.competition ??
          item?.competition ??
          0;
        const cpc =
          item?.keyword_info?.cpc ??
          item?.cpc ??
          0;
        const monthlySearchesRaw =
          item?.keyword_info?.monthly_searches ?? [];
        const monthlySearches = Array.isArray(monthlySearchesRaw)
          ? monthlySearchesRaw
              .map((entry: any) => ({
                year: Number(entry?.year) || 0,
                month: Number(entry?.month) || 0,
                search_volume: Number(entry?.search_volume) || 0,
              }))
              .filter((entry: { year: number; month: number }) => entry.year > 0 && entry.month > 0)
              .sort((a: { year: number; month: number }, b: { year: number; month: number }) => {
                if (a.year !== b.year) return a.year - b.year;
                return a.month - b.month;
              })
          : [];

        return {
          keyword: item?.keyword ?? "",
          volume: Number(volume) || 0,
          difficulty: Math.round((Number(competition) || 0) * 100),
          cpc: Number(cpc) || 0,
          competition: Number(competition) || 0,
          monthlySearches,
        };
      });

      const serpRes = await fetch("https://api.dataforseo.com/v3/serp/google/organic/live/regular", {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          {
            keyword,
            location_code: locationCode,
            language_code: languageCode,
            depth: 10,
            se_domain: "google.com",
            device: "desktop",
          },
        ]),
      });

      if (serpRes.ok) {
        const serpJson = await serpRes.json();
        const serpItems = serpJson?.tasks?.[0]?.result?.[0]?.items ?? [];
        serpAnalysis = (Array.isArray(serpItems) ? serpItems : [])
          .slice(0, 10)
          .map((item: any) => {
            let domain = item?.domain ?? "";
            if (!domain && item?.url) {
              try {
                domain = new URL(item.url).hostname.replace(/^www\./, "");
              } catch {
                domain = "";
              }
            }
            return {
              rank: Number(item?.rank_absolute) || 0,
              title: item?.title ?? "",
              url: item?.url ?? "",
              domain,
              estimatedTraffic:
                typeof item?.etv === "number"
                  ? item.etv
                  : typeof item?.estimated_paid_traffic_cost === "number"
                    ? item.estimated_paid_traffic_cost
                    : null,
              domainAuthority:
                typeof item?.domain_rank === "number"
                  ? item.domain_rank
                  : null,
              backlinks:
                typeof item?.backlinks_info?.external_links_count === "number"
                  ? item.backlinks_info.external_links_count
                  : typeof item?.backlinks_count === "number"
                    ? item.backlinks_count
                    : null,
            };
          });
      }
    }

    let autocompleteSuggestions: string[] = [];
    if (keyword) {
      try {
        const locationCode =
          COUNTRY_LOCATION_CODES[country.toLowerCase()] ??
          COUNTRY_LOCATION_CODES.us;
        const languageCode =
          LANGUAGE_CODES[language.toLowerCase()] ?? LANGUAGE_CODES.en;
        const suggestRes = await fetch(
          "https://api.dataforseo.com/v3/dataforseo_labs/google/keyword_suggestions/live",
          {
            method: "POST",
            headers: {
              Authorization: authHeader,
              "Content-Type": "application/json",
            },
            body: JSON.stringify([
              {
                keyword,
                location_code: locationCode,
                language_code: languageCode,
                include_seed_keyword: true,
                limit: 20,
              },
            ]),
          }
        );
        if (suggestRes.ok) {
          const suggestJson = await suggestRes.json();
          const suggestItems = suggestJson?.tasks?.[0]?.result?.[0]?.items ?? [];
          autocompleteSuggestions = (Array.isArray(suggestItems) ? suggestItems : [])
            .map((it: any) => String(it?.keyword ?? "").trim())
            .filter(Boolean)
            .slice(0, 12);
        }
      } catch {
        autocompleteSuggestions = [];
      }
    }
    if (autocompleteSuggestions.length === 0 && keyword) {
      const seed = keyword.trim().toLowerCase();
      autocompleteSuggestions = [
        `${seed} tools`,
        `${seed} checklist`,
        `${seed} strategy`,
        `${seed} for beginners`,
        `best ${seed}`,
        `how to ${seed}`,
        `${seed} examples`,
        `${seed} template`,
      ].slice(0, 12);
    }

    const suggestionBuckets = buildServerSuggestionBuckets(keywords, keyword ?? "");
    const questionsFromSerp = serpAnalysis
      .map((row) => row.title.trim())
      .filter((title) => /^(how|what|why|when|where|which|who|can|is|are|does|do)\b/i.test(title))
      .slice(0, 6);
    if (questionsFromSerp.length > 0) {
      const mergedQuestions = [
        ...suggestionBuckets.questions.map((q) => q.keyword),
        ...questionsFromSerp,
      ];
      const uniqueQuestionKeywords = [...new Set(mergedQuestions)].slice(0, 12);
      suggestionBuckets.questions = uniqueQuestionKeywords.map((q) => {
        const existing = keywords.find((k) => k.keyword.toLowerCase() === q.toLowerCase());
        return (
          existing ?? {
            keyword: q,
            volume: 0,
            difficulty: 0,
            cpc: 0,
            competition: 0,
          }
        );
      });
    }

    if (projectId && keywords.length) {
      const project = user
        ? await prisma.project.findFirst({
            where: { id: projectId, userId: user.id },
          })
        : null;

      if (project) {
        let targetFolderId: string | null = null;
        if (folderId) {
          const existingFolder = await prisma.keywordFolder.findFirst({
            where: { id: folderId, projectId: project.id },
            select: { id: true },
          });
          targetFolderId = existingFolder?.id ?? null;
        } else if (folderName) {
          const createdOrExisting = await prisma.keywordFolder.upsert({
            where: {
              projectId_name: {
                projectId: project.id,
                name: folderName,
              },
            },
            update: {},
            create: {
              projectId: project.id,
              name: folderName,
            },
            select: { id: true },
          });
          targetFolderId = createdOrExisting.id;
        }

        await prisma.keyword.createMany({
          data: keywords.slice(0, 50).map((k) => ({
            keyword: k.keyword,
            volume: k.volume,
            difficulty: k.difficulty,
            cpc: k.cpc,
            projectId: project.id,
            folderId: targetFolderId,
          })),
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        seedKeyword: keyword ?? "",
        keywords: keywords.filter((k) => k.keyword),
        keywordClusters: buildKeywordClusters(
          keywords.filter((k) => k.keyword),
          keyword ?? ""
        ),
        suggestions: {
          related: rankKeywordRows(keywords).slice(0, 15),
          longTail: suggestionBuckets.longTail,
          questions: suggestionBuckets.questions,
          semantic: suggestionBuckets.semantic,
          autocomplete: autocompleteSuggestions,
          source: "dataforseo_plus_fallback",
        },
        serpAnalysis,
        filters: { country, language },
        source: "dataforseo",
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: "API_ERROR",
        message: error instanceof Error ? error.message : "Keyword API failed",
      },
      { status: 500 }
    );
  }
}

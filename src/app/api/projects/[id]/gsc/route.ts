import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fetchGscDimension, summarizeRows } from "@/lib/gsc";
import { dataForSeoPost } from "@/lib/dataforseo";

function normalizeSiteUrl(input: string, fallbackDomain: string) {
  const raw = (input || "").trim();
  if (!raw) return `sc-domain:${fallbackDomain.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`;
  if (raw.startsWith("sc-domain:")) return raw;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  return `sc-domain:${raw.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`;
}

function defaultDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 28);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

function toDomainFromSiteUrl(siteUrl: string, fallbackDomain: string) {
  const raw = (siteUrl || "").trim();
  if (!raw) return fallbackDomain.replace(/^www\./, "");
  if (raw.startsWith("sc-domain:")) return raw.replace("sc-domain:", "").replace(/^www\./, "");
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    try {
      return new URL(raw).hostname.replace(/^www\./, "");
    } catch {
      return fallbackDomain.replace(/^www\./, "");
    }
  }
  return raw.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/+$/, "");
}

async function fetchEstimatedFallback(siteUrl: string, domain: string) {
  const ranked = await dataForSeoPost<{
    tasks?: Array<{
      result?: Array<{
        items?: Array<Record<string, unknown>>;
      }>;
    }>;
  }>("/v3/dataforseo_labs/google/ranked_keywords/live", [
    {
      target: domain,
      limit: 100,
      offset: 0,
      location_code: 2840,
      language_code: "en",
    },
  ]);

  if (!ranked.success) {
    throw new Error(
      ranked.error === "API_KEYS_REQUIRED"
        ? "DataForSEO is not configured by the account owner yet."
        : ranked.error || "Failed to build estimated fallback data"
    );
  }

  const items =
    ranked.data?.tasks?.[0]?.result?.[0]?.items && Array.isArray(ranked.data.tasks[0].result?.[0]?.items)
      ? (ranked.data.tasks[0].result?.[0]?.items as Array<Record<string, unknown>>)
      : [];

  const queryRows = items.slice(0, 25).map((it) => {
    const kwData = (it.keyword_data ?? {}) as Record<string, unknown>;
    const kwInfo = (kwData.keyword_info ?? {}) as Record<string, unknown>;
    const serpEl = (it.ranked_serp_element ?? {}) as Record<string, unknown>;
    const serpItem = (serpEl.serp_item ?? {}) as Record<string, unknown>;
    const estimatedClicks = Number(serpItem.etv ?? 0) || 0;
    const impressions = Number(kwInfo.search_volume ?? 0) || 0;
    const position = Number(serpItem.rank_absolute ?? serpItem.rank_group ?? 0) || 0;
    return {
      query: String(kwData.keyword ?? it.keyword ?? ""),
      clicks: Math.round(estimatedClicks),
      impressions,
      ctr: impressions > 0 ? (estimatedClicks / impressions) * 100 : 0,
      position,
      url: String(serpItem.url ?? ""),
    };
  });

  const pageMap = new Map<string, { clicks: number; impressions: number; weightedPosition: number; ctrWeight: number }>();
  queryRows.forEach((q) => {
    const key = q.url || "/";
    const existing = pageMap.get(key) ?? { clicks: 0, impressions: 0, weightedPosition: 0, ctrWeight: 0 };
    existing.clicks += q.clicks;
    existing.impressions += q.impressions;
    existing.weightedPosition += q.position * (q.impressions || 1);
    existing.ctrWeight += q.impressions || 1;
    pageMap.set(key, existing);
  });

  const topPages = [...pageMap.entries()]
    .map(([page, m]) => ({
      page,
      clicks: m.clicks,
      impressions: m.impressions,
      ctr: m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0,
      position: m.ctrWeight > 0 ? m.weightedPosition / m.ctrWeight : 0,
    }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 25);

  const totalClicks = queryRows.reduce((s, r) => s + r.clicks, 0);
  const totalImpressions = queryRows.reduce((s, r) => s + r.impressions, 0);
  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const avgPosition =
    queryRows.length > 0
      ? queryRows.reduce((s, r) => s + (r.position || 0), 0) / queryRows.length
      : 0;

  return {
    siteUrl,
    summary: {
      totalClicks,
      totalImpressions,
      avgCtr,
      avgPosition,
    },
    topQueries: queryRows.map(({ url: _url, ...rest }) => rest),
    topPages,
    countries: [
      {
        country: "US (estimated)",
        clicks: totalClicks,
        impressions: totalImpressions,
        ctr: avgCtr,
        position: avgPosition,
      },
    ],
    devices: [
      {
        device: "all (estimated)",
        clicks: totalClicks,
        impressions: totalImpressions,
        ctr: avgCtr,
        position: avgPosition,
      },
    ],
    source: "estimated" as const,
    sourceNote:
      "Live GSC access unavailable for this property. Showing estimated insights from DataForSEO ranked keywords.",
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clerkOrApiUserId = await getUserIdFromRequest(request);
    if (!clerkOrApiUserId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: clerkOrApiUserId },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const { id: projectId } = await params;
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: user.id },
      select: { id: true, domain: true, name: true },
    });
    if (!project) {
      return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const defaults = defaultDateRange();
    const startDate = typeof body.startDate === "string" ? body.startDate : defaults.startDate;
    const endDate = typeof body.endDate === "string" ? body.endDate : defaults.endDate;
    const siteUrl = normalizeSiteUrl(
      typeof body.siteUrl === "string" ? body.siteUrl : "",
      project.domain
    );

    try {
      const [queries, pages, countries, devices] = await Promise.all([
        fetchGscDimension({ siteUrl, startDate, endDate, dimension: "query", rowLimit: 25 }),
        fetchGscDimension({ siteUrl, startDate, endDate, dimension: "page", rowLimit: 25 }),
        fetchGscDimension({ siteUrl, startDate, endDate, dimension: "country", rowLimit: 10 }),
        fetchGscDimension({ siteUrl, startDate, endDate, dimension: "device", rowLimit: 10 }),
      ]);

      const queryRows = queries.rows ?? [];
      const summary = summarizeRows(queryRows);

      return NextResponse.json({
        success: true,
        data: {
          siteUrl,
          projectName: project.name,
          range: { startDate, endDate },
          summary,
          topQueries: queryRows.map((r) => ({
            query: r.keys?.[0] ?? "",
            clicks: r.clicks ?? 0,
            impressions: r.impressions ?? 0,
            ctr: (r.ctr ?? 0) * 100,
            position: r.position ?? 0,
          })),
          topPages: (pages.rows ?? []).map((r) => ({
            page: r.keys?.[0] ?? "",
            clicks: r.clicks ?? 0,
            impressions: r.impressions ?? 0,
            ctr: (r.ctr ?? 0) * 100,
            position: r.position ?? 0,
          })),
          countries: (countries.rows ?? []).map((r) => ({
            country: r.keys?.[0] ?? "",
            clicks: r.clicks ?? 0,
            impressions: r.impressions ?? 0,
            ctr: (r.ctr ?? 0) * 100,
            position: r.position ?? 0,
          })),
          devices: (devices.rows ?? []).map((r) => ({
            device: r.keys?.[0] ?? "",
            clicks: r.clicks ?? 0,
            impressions: r.impressions ?? 0,
            ctr: (r.ctr ?? 0) * 100,
            position: r.position ?? 0,
          })),
          source: "gsc",
          sourceNote: "",
        },
      });
    } catch (gscError) {
      const domain = toDomainFromSiteUrl(siteUrl, project.domain);
      const estimated = await fetchEstimatedFallback(siteUrl, domain);
      return NextResponse.json({
        success: true,
        data: {
          projectName: project.name,
          range: { startDate, endDate },
          ...estimated,
        },
      });
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "GSC_FETCH_FAILED",
        message: error instanceof Error ? error.message : "Failed to fetch Search Console data",
      },
      { status: 500 }
    );
  }
}

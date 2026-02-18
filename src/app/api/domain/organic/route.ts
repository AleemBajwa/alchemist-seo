import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dataForSeoPost } from "@/lib/dataforseo";
import { getUserIdFromRequest } from "@/lib/auth";

const schema = z.object({
  target: z.string().min(1).max(500),
  limit: z.number().min(1).max(700).optional().default(100),
  offset: z.number().min(0).optional().default(0),
  locationCode: z.number().optional().default(2840),
  languageCode: z.string().optional().default("en"),
});

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { target, limit, offset, locationCode, languageCode } = schema.parse(body);
    const domain = target.startsWith("http")
      ? new URL(target).hostname.replace(/^www\./, "")
      : target.replace(/^www\./, "");

    const result = await dataForSeoPost(
      "/v3/dataforseo_labs/google/ranked_keywords/live",
      [{ target: domain, limit, offset, location_code: locationCode, language_code: languageCode }]
    );

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          message:
            result.error === "API_KEYS_REQUIRED"
              ? "DataForSEO is not configured by the account owner yet."
              : result.error,
        },
        { status: result.error === "API_KEYS_REQUIRED" ? 402 : 500 }
      );
    }

    const raw = result.data as Record<string, unknown>;
    const task = Array.isArray(raw?.tasks) ? raw.tasks[0] : null;
    const res = (task as Record<string, unknown>)?.result as Record<string, unknown>[] | undefined;
    const items = (Array.isArray(res) && res[0] ? (res[0] as Record<string, unknown>)?.items : null) as Array<Record<string, unknown>> | null;

    const firstResult = Array.isArray(res) && res[0] ? (res[0] as Record<string, unknown>) : null;
    const totalCount = firstResult?.total_count as number | undefined;

    const keywords = (items ?? []).map((it) => {
      const kwData = (it.keyword_data ?? {}) as Record<string, unknown>;
      const kwInfo = (kwData.keyword_info ?? {}) as Record<string, unknown>;
      const serpEl = (it.ranked_serp_element ?? {}) as Record<string, unknown>;
      const serpItem = (serpEl.serp_item ?? {}) as Record<string, unknown>;
      return {
        keyword: (kwData.keyword ?? it.keyword ?? "") as string,
        position: (serpItem.rank_absolute ?? serpItem.rank_group ?? null) as number | null,
        searchVolume: (kwInfo.search_volume ?? null) as number | null,
        cpc: (kwInfo.cpc ?? null) as number | null,
        competition: (kwInfo.competition ?? null) as number | null,
        etv: (serpItem.etv ?? null) as number | null,
        serpInfo: it.serp_info ?? null,
      };
    });

    return NextResponse.json({
      success: true,
      data: { domain, keywords, totalCount: totalCount ?? null },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { success: false, error: "ORGANIC_KEYWORDS_FAILED", message: String(error) },
      { status: 500 }
    );
  }
}

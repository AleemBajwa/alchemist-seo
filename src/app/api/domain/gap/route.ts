import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dataForSeoPost } from "@/lib/dataforseo";
import { getUserIdFromRequest } from "@/lib/auth";

const schema = z.object({
  target1: z.string().min(1).max(500),
  target2: z.string().min(1).max(500),
  locationCode: z.number().optional().default(2840),
  languageCode: z.string().optional().default("en"),
  filters: z.array(z.string()).optional(),
});

function normalizeDomain(target: string) {
  if (target.startsWith("http")) {
    try {
      return new URL(target).hostname.replace(/^www\./, "");
    } catch {
      return target.replace(/^www\./, "");
    }
  }
  return target.replace(/^www\./, "");
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { target1, target2, locationCode, languageCode, filters } = schema.parse(body);
    const domain1 = normalizeDomain(target1);
    const domain2 = normalizeDomain(target2);

    const result = await dataForSeoPost(
      "/v3/dataforseo_labs/google/domain_intersection/live",
      [
        {
          target1: domain1,
          target2: domain2,
          location_code: locationCode,
          language_code: languageCode,
          filters: filters ?? undefined,
          limit: 100,
        },
      ]
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
    const taskObjCheck = Array.isArray(raw?.tasks) ? raw.tasks[0] : null;
    const taskStatus = (taskObjCheck as Record<string, unknown>)?.status_code as number | undefined;
    if (taskStatus && taskStatus >= 40000) {
      const msg = (taskObjCheck as Record<string, unknown>)?.status_message as string | undefined;
      return NextResponse.json(
        {
          success: false,
          error: "API_ERROR",
          message: msg ?? `DataForSEO error (${taskStatus})`,
        },
        { status: 502 }
      );
    }

    const task = taskObjCheck as Record<string, unknown> | null;
    const res = task?.result as Record<string, unknown>[] | undefined;
    const firstResult = Array.isArray(res) && res[0] ? res[0] : null;
    const metrics = (firstResult ?? {}) as Record<string, unknown>;
    const items = (metrics.items ?? []) as Array<Record<string, unknown>>;

    const keywords = items.map((it) => {
      const kwData = (it.keyword_data ?? {}) as Record<string, unknown>;
      const kwInfo = (kwData.keyword_info ?? {}) as Record<string, unknown>;
      const firstEl = (it.first_domain_serp_element ?? {}) as Record<string, unknown>;
      const secondEl = (it.second_domain_serp_element ?? {}) as Record<string, unknown>;
      return {
        keyword: (kwData.keyword ?? it.keyword ?? "") as string,
        position1: (firstEl.rank_absolute ?? null) as number | null,
        position2: (secondEl.rank_absolute ?? null) as number | null,
        searchVolume: (kwInfo.search_volume ?? null) as number | null,
        cpc: (kwInfo.cpc ?? null) as number | null,
        competition: (kwInfo.competition ?? null) as number | null,
        etv: (firstEl.etv ?? secondEl.etv ?? null) as number | null,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        domain1,
        domain2,
        keywords,
        metrics: {
          totalKeywords: metrics.total_count ?? keywords.length,
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { success: false, error: "KEYWORD_GAP_FAILED", message: String(error) },
      { status: 500 }
    );
  }
}

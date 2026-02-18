import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dataForSeoPost } from "@/lib/dataforseo";
import { getUserIdFromRequest } from "@/lib/auth";

const schema = z.object({
  target: z.string().min(1).max(500),
  locationCode: z.number().optional().default(2840),
  languageCode: z.string().optional().default("en"),
});

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { target, locationCode, languageCode } = schema.parse(body);
    const domain = target.startsWith("http")
      ? new URL(target).hostname.replace(/^www\./, "")
      : target.replace(/^www\./, "");

    const result = await dataForSeoPost(
      "/v3/dataforseo_labs/google/domain_rank_overview/live",
      [{ target: domain, location_code: locationCode, language_code: languageCode }]
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
    const firstResult = Array.isArray(res) && res[0] ? res[0] : null;
    const metrics = (firstResult ?? {}) as Record<string, unknown>;

    const items = (metrics.items ?? []) as Array<Record<string, unknown>>;
    const firstItem = items[0];
    const itemMetrics = (firstItem?.metrics ?? {}) as Record<string, unknown>;
    const organic = (itemMetrics.organic ?? {}) as Record<string, unknown>;

    const etv = organic.etv ?? null;
    const count = organic.count ?? null;
    const totalCount = metrics.total_count ?? metrics.items_count ?? count ?? null;

    return NextResponse.json({
      success: true,
      data: {
        domain,
        rank: null,
        etv: typeof etv === "number" ? etv : null,
        count: typeof totalCount === "number" ? totalCount : (typeof count === "number" ? count : null),
        isNew: organic.is_new ?? null,
        items: metrics.items ?? [],
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { success: false, error: "DOMAIN_OVERVIEW_FAILED", message: String(error) },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dataForSeoPost } from "@/lib/dataforseo";
import { getUserIdFromRequest } from "@/lib/auth";

const schema = z.object({
  target: z.string().min(1).max(500),
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
    const { target } = schema.parse(body);
    const domain = normalizeDomain(target);

    const result = await dataForSeoPost("/v3/backlinks/summary/live", [{ target: domain }]);

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
    const tasks = raw?.tasks;
    const taskObj = Array.isArray(tasks) && tasks[0] ? (tasks[0] as Record<string, unknown>) : null;
    const taskStatus = (taskObj?.status_code as number | undefined) ?? 0;

    const res = taskObj?.result as unknown;
    const item = Array.isArray(res) && res.length > 0 ? res[0] : res && typeof res === "object" && !Array.isArray(res) ? res : null;
    const metrics = (item ?? {}) as Record<string, unknown>;

    const backlinksVal = metrics.backlinks;
    const referringDomainsVal = metrics.referring_domains;
    const rankVal = metrics.rank;

    if (taskStatus >= 40000) {
      const msg = (taskObj?.status_message as string) ?? `DataForSEO error ${taskStatus}`;
      const userMsg = taskStatus === 40204
        ? "Backlinks API access not available. This requires a separate DataForSEO Backlinks subscription."
        : msg;
      return NextResponse.json({
        success: true,
        data: {
          domain,
          backlinks: null,
          referringDomains: null,
          referringMainDomains: null,
          referringIps: null,
          referringSubnets: null,
          rank: null,
          backlinksSpamScore: null,
          brokenBacklinks: null,
          brokenPages: null,
          referringLinksTypes: null,
          error: userMsg,
          errorCode: taskStatus,
        },
      });
    }

    const data: Record<string, unknown> = {
      domain,
      backlinks: typeof backlinksVal === "number" ? backlinksVal : null,
      referringDomains: typeof referringDomainsVal === "number" ? referringDomainsVal : null,
      referringMainDomains: typeof metrics.referring_main_domains === "number" ? metrics.referring_main_domains : null,
      referringIps: typeof metrics.referring_ips === "number" ? metrics.referring_ips : null,
      referringSubnets: typeof metrics.referring_subnets === "number" ? metrics.referring_subnets : null,
      rank: typeof rankVal === "number" ? rankVal : null,
      backlinksSpamScore: typeof metrics.backlinks_spam_score === "number" ? metrics.backlinks_spam_score : null,
      brokenBacklinks: typeof metrics.broken_backlinks === "number" ? metrics.broken_backlinks : null,
      brokenPages: typeof metrics.broken_pages === "number" ? metrics.broken_pages : null,
      referringLinksTypes: metrics.referring_links_types ?? null,
    };

    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { success: false, error: "BACKLINKS_FAILED", message: String(error) },
      { status: 500 }
    );
  }
}

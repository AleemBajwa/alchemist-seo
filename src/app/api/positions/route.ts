import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  keyword: z.string().min(1).max(200),
  target: z.string().min(1).max(500),
  database: z.string().optional().default("us"),
  projectId: z.string().optional(),
});

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
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    const body = await request.json();
    const { keyword, target, projectId } = schema.parse(body);

    const domain = target.startsWith("http")
      ? new URL(target).hostname.replace(/^www\./, "")
      : target.replace(/^www\./, "");

    const dfsRes = await fetch("https://api.dataforseo.com/v3/serp/google/organic/live/regular", {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        {
          keyword,
          location_code: 2840,
          language_code: "en",
          depth: 100,
          se_domain: "google.com",
          device: "desktop",
        },
      ]),
    });
    const dfsJson = await dfsRes.json();

    if (!dfsRes.ok || dfsJson?.status_code >= 40000) {
      return NextResponse.json(
        {
          success: false,
          error: "API_ERROR",
          message: dfsJson?.status_message || "DataForSEO position tracking failed",
        },
        { status: 500 }
      );
    }

    const items = dfsJson?.tasks?.[0]?.result?.[0]?.items ?? [];
    const results = (Array.isArray(items) ? items : []).map((item: any) => {
      const url = item?.url ?? "";
      let itemDomain = "";
      try {
        itemDomain = new URL(url).hostname.replace(/^www\./, "");
      } catch {
        itemDomain = "";
      }
      const isTarget = !!itemDomain && (itemDomain.includes(domain) || domain.includes(itemDomain));
      return {
        position: Number(item?.rank_absolute) || 0,
        url,
        title: item?.title ?? "",
        domain: itemDomain,
        isTarget,
      };
    });

    const targetRow = results.find((r) => r.isTarget) ?? null;

    if (projectId && userId) {
      const dbUser = await prisma.user.findUnique({
        where: { clerkId: userId },
        include: { projects: true },
      });
      const project = dbUser?.projects.find((p) => p.id === projectId);
      if (project) {
        let tk = await prisma.trackedKeyword.findFirst({
          where: { projectId, keyword, domain },
        });
        if (!tk) {
          tk = await prisma.trackedKeyword.create({
            data: {
              projectId,
              keyword,
              domain,
              position: targetRow?.position ?? null,
              url: targetRow?.url ?? null,
              lastChecked: new Date(),
            },
          });
        } else {
          await prisma.trackedKeyword.update({
            where: { id: tk.id },
            data: {
              position: targetRow?.position ?? null,
              url: targetRow?.url ?? null,
              lastChecked: new Date(),
            },
          });
        }
        await prisma.positionHistory.create({
          data: {
            trackedKeywordId: tk.id,
            position: targetRow?.position ?? null,
            url: targetRow?.url ?? null,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        keyword,
        target: domain,
        position: targetRow?.position ?? null,
        url: targetRow?.url ?? null,
        results: results.slice(0, 100),
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
        message: error instanceof Error ? error.message : "Position tracking failed",
      },
      { status: 500 }
    );
  }
}

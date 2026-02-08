import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

const schema = z.object({
  keyword: z.string().min(1).max(200),
  target: z.string().min(1).max(500),
  locationCode: z.number().optional().default(2840),
});

async function getDataForSEOCredentials(userId: string) {
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { apiKeys: true },
  });
  const dfKey = user?.apiKeys.find((k) => k.provider === "dataforseo");
  if (dfKey?.login && dfKey?.password) {
    return { login: dfKey.login, password: dfKey.password };
  }
  return {
    login: process.env.DATA_FOR_SEO_LOGIN || null,
    password: process.env.DATA_FOR_SEO_PASSWORD || null,
  };
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { login, password } = await getDataForSEOCredentials(userId);
    if (!login || !password) {
      return NextResponse.json(
        {
          success: false,
          error: "API_KEYS_REQUIRED",
          message: "Add DataForSEO credentials in Settings.",
        },
        { status: 402 }
      );
    }

    const body = await request.json();
    const { keyword, target, locationCode } = schema.parse(body);

    const domain = target.startsWith("http")
      ? new URL(target).hostname.replace(/^www\./, "")
      : target.replace(/^www\./, "");

    const authHeader = Buffer.from(`${login}:${password}`).toString("base64");
    const response = await fetch(
      "https://api.dataforseo.com/v3/serp/google/organic/live/advanced",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${authHeader}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          {
            keyword,
            location_code: locationCode,
            language_code: "en",
            device: "desktop",
          },
        ]),
      }
    );

    const data = await response.json();
    const task = data.tasks?.[0];
    const result = task?.result?.[0];
    const items = result?.items || [];

    const positions = items
      .filter((item: { type: string }) => item.type === "organic")
      .map((item: { rank_absolute: number; url: string; title: string; domain: string }, idx: number) => {
        const rank = item.rank_absolute ?? idx + 1;
        const itemDomain = item.domain || "";
        const isTarget = itemDomain.includes(domain) || domain.includes(itemDomain);
        return {
          position: rank,
          url: item.url,
          title: item.title,
          domain: item.domain,
          isTarget,
        };
      });

    const targetResult = positions.find((p: { isTarget: boolean }) => p.isTarget);

    return NextResponse.json({
      success: true,
      data: {
        keyword,
        target: domain,
        position: targetResult?.position ?? null,
        url: targetResult?.url ?? null,
        results: positions.slice(0, 100),
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
        message: error instanceof Error ? error.message : "SERP API failed",
      },
      { status: 500 }
    );
  }
}

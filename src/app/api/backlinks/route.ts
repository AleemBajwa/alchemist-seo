import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

const schema = z.object({
  target: z.string().min(1).max(500),
  limit: z.number().min(1).max(100).optional().default(20),
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
    const { target, limit } = schema.parse(body);

    const targetUrl = target.startsWith("http") ? target : `https://${target}`;
    const domain = new URL(targetUrl).hostname.replace(/^www\./, "");

    const authHeader = Buffer.from(`${login}:${password}`).toString("base64");
    const response = await fetch(
      "https://api.dataforseo.com/v3/backlinks/summary/live",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${authHeader}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([{ target: domain }]),
      }
    );

    const data = await response.json();
    const task = data.tasks?.[0];
    const result = task?.result?.[0];

    if (!result) {
      return NextResponse.json({
        success: true,
        data: {
          backlinks: 0,
          referringDomains: 0,
          referringMainDomains: 0,
          items: [],
          message: task?.status_message || "No data available",
        },
      });
    }

    const backlinksResponse = await fetch(
      "https://api.dataforseo.com/v3/backlinks/backlinks/live",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${authHeader}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([{ target: domain, limit }]),
      }
    );

    const backlinksData = await backlinksResponse.json();
    const blTask = backlinksData.tasks?.[0];
    const blResult = blTask?.result?.[0];
    const items = (blResult?.items || []).map((item: { url_from: string; url_to: string; page_from_title?: string }) => ({
      url: item.url_from,
      target: item.url_to,
      pageTitle: item.page_from_title || "",
    }));

    return NextResponse.json({
      success: true,
      data: {
        backlinks: result.backlinks || 0,
        referringDomains: result.referring_domains || 0,
        referringMainDomains: result.referring_main_domains || 0,
        items,
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
        message: error instanceof Error ? error.message : "Backlinks API failed",
      },
      { status: 500 }
    );
  }
}

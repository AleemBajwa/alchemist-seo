import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

const schema = z.object({
  keyword: z.string().min(1).max(200),
  country: z.string().optional().default("us"),
  projectId: z.string().optional(),
  saveKeywords: z
    .array(
      z.object({
        keyword: z.string(),
        volume: z.number().optional(),
        difficulty: z.number().optional(),
        cpc: z.number().optional(),
      })
    )
    .optional(),
});

type KeywordResult = {
  keyword: string;
  volume: number;
  difficulty: number;
  cpc: number;
  competition: number;
};

async function fetchKeywordsFromAPI(
  keyword: string,
  login: string,
  password: string
): Promise<KeywordResult[]> {
  const authHeader = Buffer.from(`${login}:${password}`).toString("base64");
  const response = await fetch(
    "https://api.dataforseo.com/v3/keywords_data/google_ads/keywords_for_keywords/live",
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${authHeader}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        {
          keyword,
          location_code: 2840,
          language_code: "en",
        },
      ]),
    }
  );
  const data = await response.json();
  if (data.tasks?.[0]?.result?.[0]?.items) {
    return data.tasks[0].result[0].items.slice(0, 50).map(
      (item: {
        keyword: string;
        search_volume: number;
        competition: number;
        cpc: number;
      }) => ({
        keyword: item.keyword,
        volume: item.search_volume || 0,
        difficulty: Math.round((item.competition || 0) * 100),
        cpc: item.cpc || 0,
        competition: item.competition || 0,
      })
    );
  }
  if (data.tasks?.[0]?.status_message) {
    throw new Error(data.tasks[0].status_message);
  }
  return [];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = schema.parse(body);
    const { keyword, country, projectId, saveKeywords } = parsed;

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Save-only mode
    if (saveKeywords?.length && projectId) {
      const user = await prisma.user.findUnique({
        where: { clerkId: userId },
      });
      const project = user
        ? await prisma.project.findFirst({
            where: { id: projectId, userId: user.id },
          })
        : null;

      if (project) {
        await prisma.keyword.createMany({
          data: saveKeywords.slice(0, 50).map((k) => ({
            keyword: k.keyword,
            volume: k.volume,
            difficulty: k.difficulty,
            cpc: k.cpc,
            projectId: project.id,
          })),
        });
      }
      return NextResponse.json({ success: true });
    }

    // Fetch mode - require DataForSEO
    let login: string | null = null;
    let password: string | null = null;

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { apiKeys: true },
    });
    const dfKey = user?.apiKeys.find((k) => k.provider === "dataforseo");
    if (dfKey?.login && dfKey?.password) {
      login = dfKey.login;
      password = dfKey.password;
    }
    if (!login || !password) {
      login = process.env.DATA_FOR_SEO_LOGIN || null;
      password = process.env.DATA_FOR_SEO_PASSWORD || null;
    }

    if (!login || !password) {
      return NextResponse.json(
        {
          success: false,
          error: "API_KEYS_REQUIRED",
          message:
            "Add your DataForSEO credentials in Settings to use keyword research.",
        },
        { status: 402 }
      );
    }

    const results = await fetchKeywordsFromAPI(keyword, login, password);

    return NextResponse.json({
      success: true,
      data: {
        seedKeyword: keyword,
        keywords: results,
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

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";

const schema = z.object({
  topic: z.string().min(2).max(300),
  clusterCount: z.number().min(2).max(12).optional().default(6),
});

type ClusterBrief = {
  title: string;
  keyword: string;
  brief: string;
  h2s: string[];
};

type BriefOutput = {
  pillarTitle: string;
  pillarKeyword: string;
  pillarBrief: string;
  pillarH2s: string[];
  clusters: ClusterBrief[];
};

function buildFallbackBrief(topic: string, clusterCount: number): BriefOutput {
  const normalized = topic.trim();
  const pillarTitle = `${normalized}: Complete Guide & Strategy`;
  const pillarBrief = `A comprehensive pillar page covering the core topic "${normalized}". Establish authority by defining the subject, outlining main subtopics, and providing actionable takeaways. Structure with clear H2 sections for each cluster, strong internal links, and CTA to cluster articles. Target 2500-4000 words.`;
  const pillarH2s = [
    `What is ${normalized}?`,
    `Key Components`,
    `Best Practices`,
    `Common Mistakes`,
    `Implementation Guide`,
  ];
  const clusterTitles: string[] = [];
  const clusters: ClusterBrief[] = [];
  const seeds = [
    "How to get started",
    "Step-by-step guide",
    "Best tools",
    "Common mistakes",
    "Advanced tactics",
    "Case studies",
    "FAQ",
    "Tips and tricks",
  ];
  for (let i = 0; i < Math.min(clusterCount, seeds.length); i++) {
    const suffix = seeds[i];
    const title = `${normalized} ${suffix}`;
    clusterTitles.push(title);
    clusters.push({
      title,
      keyword: title.toLowerCase(),
      brief: `Supporting cluster article for "${title}". Target 1200-1800 words. Link to pillar and related clusters. Include H2s: introduction, main points, practical steps, summary.`,
      h2s: ["Introduction", "Main Points", "Practical Steps", "Summary"],
    });
  }
  return {
    pillarTitle,
    pillarKeyword: normalized.toLowerCase(),
    pillarBrief,
    pillarH2s,
    clusters,
  };
}

async function generateBriefWithLlm(topic: string, clusterCount: number): Promise<BriefOutput | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const baseUrl = (process.env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1").replace(/\/$/, "");
  const model =
    process.env.OPENAI_MODEL?.trim() ||
    process.env.AI_MODEL?.trim() ||
    "gpt-4o-mini";

  const prompt = `You are an expert SEO content strategist. Create a pillar-cluster content brief for the topic: "${topic}".

Output a JSON object with this exact structure:
{
  "pillarTitle": "Main pillar page title",
  "pillarKeyword": "primary keyword",
  "pillarBrief": "2-4 sentence content brief for the pillar page: purpose, scope, target audience, word count suggestion (2500-4000)",
  "pillarH2s": ["H2 1", "H2 2", ...],
  "clusters": [
    {
      "title": "Cluster article title",
      "keyword": "primary keyword for cluster",
      "brief": "1-3 sentence brief for this cluster",
      "h2s": ["H2 1", "H2 2", ...]
    }
  ]
}

Generate exactly ${clusterCount} clusters. Each cluster should target a specific subtopic and link back to the pillar. Output ONLY valid JSON.`;

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.5,
      messages: [
        { role: "system", content: "Output strict JSON only. No markdown, no code fences." },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!res.ok) return null;
  const json = await res.json();
  const raw = json?.choices?.[0]?.message?.content;
  if (typeof raw !== "string") return null;

  try {
    const parsed = JSON.parse(raw.replace(/```\w*\n?/g, "").trim()) as BriefOutput;
    if (!parsed.pillarTitle || !Array.isArray(parsed.clusters)) return null;
    parsed.clusters = parsed.clusters.slice(0, clusterCount);
    parsed.clusters.forEach((c) => {
      if (!c.title) c.title = c.keyword || "Untitled";
      if (!c.brief) c.brief = `Cluster article for ${c.title}`;
      if (!Array.isArray(c.h2s)) c.h2s = [];
    });
    if (!Array.isArray(parsed.pillarH2s)) parsed.pillarH2s = [];
    return parsed;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { topic, clusterCount } = schema.parse(body);

    const llmResult = await generateBriefWithLlm(topic, clusterCount);
    const data = llmResult ?? buildFallbackBrief(topic, clusterCount);

    return NextResponse.json({
      success: true,
      data: {
        ...data,
        generationSource: llmResult ? "llm" : "fallback",
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { success: false, message: "Brief generation failed" },
      { status: 500 }
    );
  }
}

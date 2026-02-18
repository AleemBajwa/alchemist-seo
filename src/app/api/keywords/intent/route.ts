import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";

const schema = z.object({
  keywords: z.array(z.string().min(1).max(200)).min(1).max(50),
});

type IntentLabel = "informational" | "navigational" | "commercial" | "transactional";

async function classifyIntentWithLlm(
  keywords: string[]
): Promise<Record<string, IntentLabel> | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const baseUrl = (process.env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1").replace(/\/$/, "");
  const model =
    process.env.OPENAI_MODEL?.trim() ||
    process.env.AI_MODEL?.trim() ||
    "gpt-4o-mini";

  const prompt = `Classify each keyword's primary search intent. Use exactly one of: informational, navigational, commercial, transactional.
Return ONLY a valid JSON object where keys are the exact keywords (as given) and values are the intent labels.
Keywords: ${JSON.stringify(keywords)}
Example output: {"best seo tools":"commercial","how to do seo":"informational"}`;

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        messages: [
          { role: "system", content: "Output strict JSON only. No markdown." },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const raw = json?.choices?.[0]?.message?.content;
    if (typeof raw !== "string") return null;
    const parsed = JSON.parse(raw.replace(/```json\n?|\n?```/g, "").trim()) as Record<string, string>;
    const out: Record<string, IntentLabel> = {};
    const valid: IntentLabel[] = ["informational", "navigational", "commercial", "transactional"];
    for (const [k, v] of Object.entries(parsed)) {
      const label = String(v).toLowerCase() as IntentLabel;
      out[k] = valid.includes(label) ? label : "informational";
    }
    return out;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { keywords } = schema.parse(body);

    const intents = await classifyIntentWithLlm(keywords);
    const mapping: Record<string, IntentLabel> = {};
    for (const kw of keywords) {
      mapping[kw] = intents?.[kw] ?? "informational";
    }

    return NextResponse.json({
      success: true,
      data: { intents: mapping, source: intents ? "llm" : "default" },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { success: false, error: "INTENT_FAILED", message: String(error) },
      { status: 500 }
    );
  }
}

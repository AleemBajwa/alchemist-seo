import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: {
        auditRuns: { orderBy: { createdAt: "desc" }, take: 30 },
        projects: { include: { _count: { select: { keywords: true, trackedKeywords: true } } } },
      },
    });
    if (!user) {
      return NextResponse.json({
        auditTrend: [],
        projects: [],
        totalKeywords: 0,
        totalTracked: 0,
      });
    }

    const auditTrend = user.auditRuns.reverse().map((a) => ({
      date: a.createdAt.toISOString().slice(0, 10),
      score: a.score,
      grade: a.grade,
      url: a.url,
    }));

    const totalKeywords = user.projects.reduce((s, p) => s + p._count.keywords, 0);
    const totalTracked = user.projects.reduce((s, p) => s + p._count.trackedKeywords, 0);

    return NextResponse.json({
      auditTrend,
      projects: user.projects.map((p) => ({
        id: p.id,
        name: p.name,
        domain: p.domain,
        keywordsCount: p._count.keywords,
        trackedCount: p._count.trackedKeywords,
      })),
      totalKeywords,
      totalTracked,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

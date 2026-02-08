import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: {
      auditRuns: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  });

  if (!user) {
    return NextResponse.json({ audits: [] });
  }

  return NextResponse.json({
    audits: user.auditRuns.map((a) => ({
      id: a.id,
      url: a.url,
      score: a.score,
      grade: a.grade,
      createdAt: a.createdAt,
    })),
  });
}

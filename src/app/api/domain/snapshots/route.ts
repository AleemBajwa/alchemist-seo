import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const saveSchema = z.object({
  domain: z.string().min(1).max(500),
  etv: z.number().nullable().optional(),
  keywordCount: z.number().nullable().optional(),
  rank: z.number().nullable().optional(),
  backlinks: z.number().nullable().optional(),
  referringDomains: z.number().nullable().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const domain = searchParams.get("domain");
    if (!domain?.trim()) {
      return NextResponse.json({ error: "domain is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user) return NextResponse.json({ snapshots: [] });

    const snapshots = await prisma.domainSnapshot.findMany({
      where: { userId: user.id, domain: domain.replace(/^www\./, "").trim() },
      orderBy: { snapshotMonth: "desc" },
      take: 24,
    });

    return NextResponse.json({
      snapshots: snapshots.map((s) => ({
        id: s.id,
        domain: s.domain,
        etv: s.etv,
        keywordCount: s.keywordCount,
        rank: s.rank,
        backlinks: s.backlinks,
        referringDomains: s.referringDomains,
        snapshotMonth: s.snapshotMonth,
        createdAt: s.createdAt,
      })),
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = saveSchema.parse(body);
    const domain = parsed.domain.replace(/^www\./, "").trim();

    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const now = new Date();
    const snapshotMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const snapshot = await prisma.domainSnapshot.upsert({
      where: {
        domain_userId_snapshotMonth: {
          domain,
          userId: user.id,
          snapshotMonth,
        },
      },
      create: {
        domain,
        userId: user.id,
        snapshotMonth,
        etv: parsed.etv ?? null,
        keywordCount: parsed.keywordCount ?? null,
        rank: parsed.rank ?? null,
        backlinks: parsed.backlinks ?? null,
        referringDomains: parsed.referringDomains ?? null,
      },
      update: {
        etv: parsed.etv ?? undefined,
        keywordCount: parsed.keywordCount ?? undefined,
        rank: parsed.rank ?? undefined,
        backlinks: parsed.backlinks ?? undefined,
        referringDomains: parsed.referringDomains ?? undefined,
      },
    });

    return NextResponse.json({ success: true, snapshot: { id: snapshot.id, snapshotMonth } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

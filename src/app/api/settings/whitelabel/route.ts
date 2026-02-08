import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  companyName: z.string().max(200).optional(),
  logoUrl: z.string().url().max(500).optional().nullable(),
  primaryColor: z.string().max(20).optional().nullable(),
});

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { whiteLabel: true },
    });
    if (!user) {
      return NextResponse.json({ whiteLabel: null });
    }

    return NextResponse.json({ whiteLabel: user.whiteLabel });
  } catch {
    return NextResponse.json({ whiteLabel: null });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const data = schema.parse(body);

    let user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user) {
      user = await prisma.user.create({
        data: { clerkId: userId, email: `${userId}@clerk.user` },
      });
    }

    const whiteLabel = await prisma.whiteLabel.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        companyName: data.companyName ?? null,
        logoUrl: data.logoUrl ?? null,
        primaryColor: data.primaryColor ?? null,
      },
      update: {
        companyName: data.companyName ?? undefined,
        logoUrl: data.logoUrl ?? undefined,
        primaryColor: data.primaryColor ?? undefined,
      },
    });

    return NextResponse.json({ success: true, whiteLabel });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

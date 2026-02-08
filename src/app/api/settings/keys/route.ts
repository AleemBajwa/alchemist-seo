import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const schema = z.object({
  provider: z.enum(["dataforseo"]),
  login: z.string().optional(),
  password: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        clerkId: userId,
        email: `${userId}@clerk.user`,
      },
    });
  }

  try {
    const body = await request.json();
    const { provider, login, password } = schema.parse(body);

    const apiKey = await prisma.userApiKey.upsert({
      where: {
        userId_provider: { userId: user.id, provider },
      },
      create: {
        userId: user.id,
        provider,
        login: login || null,
        password: password || null,
      },
      update: {
        login: login ?? undefined,
        password: password ?? undefined,
      },
    });

    return NextResponse.json({
      success: true,
      provider,
      hasCredentials: !!(login && password),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { apiKeys: true },
  });

  if (!user) {
    return NextResponse.json({ keys: [] });
  }

  return NextResponse.json({
    keys: user.apiKeys.map((k) => ({
      provider: k.provider,
      hasCredentials: !!(k.login && k.password),
    })),
  });
}

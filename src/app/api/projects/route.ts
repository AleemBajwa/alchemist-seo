import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  domain: z.string().min(1).max(255),
});

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { projects: { orderBy: { createdAt: "desc" } } },
  });

  if (!user) {
    return NextResponse.json({ projects: [] });
  }

  return NextResponse.json({ projects: user.projects });
}

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
    const { name, domain } = createSchema.parse(body);

    const project = await prisma.project.create({
      data: {
        name,
        domain: domain.replace(/^https?:\/\//, "").replace(/\/$/, ""),
        userId: user.id,
      },
    });

    return NextResponse.json({ project });
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

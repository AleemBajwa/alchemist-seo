import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const createSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

async function getUserProject(userId: string, projectId: string) {
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true },
  });
  if (!user) return null;
  return prisma.project.findFirst({
    where: { id: projectId, userId: user.id },
    select: { id: true },
  });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const project = await getUserProject(userId, id);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const folders = await prisma.keywordFolder.findMany({
    where: { projectId: project.id },
    orderBy: [{ name: "asc" }],
    include: {
      _count: {
        select: { keywords: true },
      },
    },
  });

  return NextResponse.json({ folders });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const project = await getUserProject(userId, id);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { name } = createSchema.parse(body);
    const folder = await prisma.keywordFolder.upsert({
      where: {
        projectId_name: {
          projectId: project.id,
          name,
        },
      },
      update: {},
      create: {
        projectId: project.id,
        name,
      },
      include: {
        _count: {
          select: { keywords: true },
        },
      },
    });
    return NextResponse.json({ success: true, folder });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { success: false, error: "Failed to create keyword folder" },
      { status: 500 }
    );
  }
}

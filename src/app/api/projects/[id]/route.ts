import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: {
      projects: {
        where: { id },
        include: {
          keywords: {
            orderBy: { createdAt: "desc" },
            take: 100,
            include: {
              folder: true,
            },
          },
          keywordFolders: {
            orderBy: { name: "asc" },
            include: {
              _count: {
                select: { keywords: true },
              },
            },
          },
          trackedKeywords: {
            include: {
              positionHistory: { orderBy: { checkedAt: "desc" }, take: 30 },
            },
          },
        },
      },
    },
  });

  const project = user?.projects[0];
  if (!project) {
    return NextResponse.json({ project: null }, { status: 404 });
  }

  return NextResponse.json({ project });
}

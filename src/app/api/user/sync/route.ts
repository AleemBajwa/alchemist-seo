import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clerkUser = await currentUser();
  const email = clerkUser?.emailAddresses?.[0]?.emailAddress;
  const name = clerkUser?.firstName
    ? [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ")
    : undefined;

  let user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { apiKeys: true },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        clerkId: userId,
        email: email || `${userId}@clerk.user`,
        name: name || null,
      },
      include: { apiKeys: true },
    });
  }

  return NextResponse.json({ user: { id: user.id, email: user.email } });
}

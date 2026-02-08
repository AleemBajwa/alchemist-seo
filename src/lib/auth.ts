import { auth } from "@clerk/nextjs/server";
import { prisma } from "./db";

export async function getCurrentUser() {
  const { userId } = await auth();
  if (!userId) return null;

  let user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { apiKeys: true },
  });

  if (!user) {
    const clerkUser = await auth();
    // Trigger Clerk to get user info - we'll sync on first load
    return null;
  }
  return user;
}

export async function getOrCreateUser(clerkId: string, email: string, name?: string) {
  let user = await prisma.user.findUnique({
    where: { clerkId },
    include: { apiKeys: true },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        clerkId,
        email: email || "unknown@example.com",
        name: name || null,
      },
      include: { apiKeys: true },
    });
  }
  return user;
}

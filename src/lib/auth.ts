import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { prisma } from "./db";
import { validateApiKey } from "./api-key";

export async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  const { userId } = await auth();
  if (userId) return userId;
  const key =
    request.headers.get("x-api-key") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    null;
  const result = await validateApiKey(key);
  return result?.userId ?? null;
}

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

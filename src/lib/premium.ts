import { prisma } from "@/lib/db";

export async function isPremiumUser(clerkId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { clerkId },
    include: { subscription: true },
  });

  if (!user?.subscription) return false;
  const sub = user.subscription;
  if (sub.status !== "active" && sub.status !== "trialing") return false;
  if (sub.currentPeriodEnd && sub.currentPeriodEnd < new Date()) return false;
  return true;
}

export async function getPremiumStatus(clerkId: string) {
  const user = await prisma.user.findUnique({
    where: { clerkId },
    include: { subscription: true },
  });

  const sub = user?.subscription;
  const isActive =
    !!sub &&
    (sub.status === "active" || sub.status === "trialing") &&
    (!sub.currentPeriodEnd || sub.currentPeriodEnd > new Date());

  return {
    isPremium: isActive,
    status: sub?.status ?? "inactive",
    currentPeriodEnd: sub?.currentPeriodEnd ?? null,
  };
}

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getPremiumStatus } from "@/lib/premium";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ isPremium: false, status: "unauthorized" }, { status: 401 });
  }

  const status = await getPremiumStatus(userId);
  return NextResponse.json(status);
}

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

function hasServerDataForSeoConfig() {
  return !!(
    process.env.DATA_FOR_SEO_API_KEY?.trim() ||
    process.env.DATAFORSEO_API_KEY?.trim() ||
    (process.env.DATA_FOR_SEO_LOGIN?.trim() &&
      process.env.DATA_FOR_SEO_PASSWORD?.trim())
  );
}

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(
    {
      success: false,
      error: "DISABLED",
      message:
        "DataForSEO is managed by the account owner via server environment variables.",
    },
    { status: 403 }
  );
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    keys: [
      {
        provider: "dataforseo",
        hasCredentials: hasServerDataForSeoConfig(),
        source: "server_env",
      },
    ],
  });
}

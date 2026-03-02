import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { google } from "googleapis";

type GscRow = { key: string; clicks: number; impressions: number; ctr: number; position: number };
type SearchAnalyticsRow = {
  keys?: string[] | null;
  clicks?: number | null;
  impressions?: number | null;
  ctr?: number | null;
  position?: number | null;
};

function normalizeDomain(domain: string) {
  return domain.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/+$/, "");
}

function getDateRange(days = 28) {
  const end = new Date();
  end.setDate(end.getDate() - 1);
  const start = new Date(end);
  start.setDate(end.getDate() - (days - 1));
  const toISO = (d: Date) => d.toISOString().slice(0, 10);
  return { startDate: toISO(start), endDate: toISO(end) };
}

function mapRows(rows: SearchAnalyticsRow[] | undefined): GscRow[] {
  return (Array.isArray(rows) ? rows : []).map((r) => ({
    key: String(r?.keys?.[0] ?? ""),
    clicks: Number(r?.clicks ?? 0),
    impressions: Number(r?.impressions ?? 0),
    ctr: Number(r?.ctr ?? 0),
    position: Number(r?.position ?? 0),
  }));
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { projects: { where: { id }, select: { id: true, domain: true, name: true } } },
    });
    const project = user?.projects?.[0];
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const clientEmail = process.env.GSC_CLIENT_EMAIL?.trim();
    const rawPrivateKey = process.env.GSC_PRIVATE_KEY?.trim() ?? "";
    const unquoted =
      rawPrivateKey.startsWith("\"") && rawPrivateKey.endsWith("\"")
        ? rawPrivateKey.slice(1, -1)
        : rawPrivateKey;
    const privateKey = unquoted
      .replace(/\\\r?\n/g, "\n")
      .replace(/\\\\n/g, "\n")
      .replace(/\\n/g, "\n")
      .replace(/\r/g, "")
      .trim();
    if (!clientEmail || !privateKey) {
      return NextResponse.json(
        {
          success: false,
          error: "GSC_NOT_CONFIGURED",
          message: "Google Search Console service account is not configured.",
        },
        { status: 400 }
      );
    }

    const jwt = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
    });
    const webmasters = google.webmasters({ version: "v3", auth: jwt });

    const sitesRes = await webmasters.sites.list();
    const entries = sitesRes.data.siteEntry ?? [];
    const availableProperties = entries.map((s) => String(s.siteUrl ?? "")).filter(Boolean);

    const requestedProperty = request.nextUrl.searchParams.get("property")?.trim();
    const domain = normalizeDomain(project.domain);
    const candidates = [
      `sc-domain:${domain}`,
      `https://${domain}/`,
      `http://${domain}/`,
      `https://www.${domain}/`,
      `http://www.${domain}/`,
    ];

    const manualOverride =
      !!requestedProperty && availableProperties.includes(requestedProperty);
    const chosenProperty =
      (manualOverride ? requestedProperty : null) ||
      candidates.find((c) => availableProperties.includes(c));

    if (!chosenProperty) {
      return NextResponse.json({
        success: true,
        data: {
          projectId: project.id,
          projectName: project.name,
          projectDomain: project.domain,
          availableProperties,
          message:
            "No matching GSC property found for this project domain. Select a property and retry.",
        },
      });
    }

    const { startDate, endDate } = getDateRange(28);
    const baseBody = { startDate, endDate, rowLimit: 10 };

    const [summaryRes, queryRes, pagesRes, countryRes, deviceRes] = await Promise.all([
      webmasters.searchanalytics.query({
        siteUrl: chosenProperty,
        requestBody: { startDate, endDate, rowLimit: 1 },
      }),
      webmasters.searchanalytics.query({
        siteUrl: chosenProperty,
        requestBody: { ...baseBody, dimensions: ["query"] },
      }),
      webmasters.searchanalytics.query({
        siteUrl: chosenProperty,
        requestBody: { ...baseBody, dimensions: ["page"] },
      }),
      webmasters.searchanalytics.query({
        siteUrl: chosenProperty,
        requestBody: { ...baseBody, dimensions: ["country"] },
      }),
      webmasters.searchanalytics.query({
        siteUrl: chosenProperty,
        requestBody: { ...baseBody, dimensions: ["device"] },
      }),
    ]);

    const summary = (summaryRes.data.rows?.[0] ?? {}) as SearchAnalyticsRow;
    return NextResponse.json({
      success: true,
      data: {
        projectId: project.id,
        projectName: project.name,
        projectDomain: project.domain,
        property: chosenProperty,
        startDate,
        endDate,
        summary: {
          clicks: Number(summary.clicks ?? 0),
          impressions: Number(summary.impressions ?? 0),
          ctr: Number(summary.ctr ?? 0),
          position: Number(summary.position ?? 0),
        },
        manualOverride,
        topQueries: mapRows(queryRes.data.rows),
        topPages: mapRows(pagesRes.data.rows),
        countries: mapRows(countryRes.data.rows),
        devices: mapRows(deviceRes.data.rows),
        availableProperties,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "GSC_FETCH_FAILED",
        message: error instanceof Error ? error.message : "Failed to fetch Search Console data",
      },
      { status: 500 }
    );
  }
}


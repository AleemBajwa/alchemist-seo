import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fetchGscDimension, summarizeRows } from "@/lib/gsc";

function normalizeSiteUrl(input: string, fallbackDomain: string) {
  const raw = (input || "").trim();
  if (!raw) return `sc-domain:${fallbackDomain.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`;
  if (raw.startsWith("sc-domain:")) return raw;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  return `sc-domain:${raw.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`;
}

function defaultDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 28);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clerkOrApiUserId = await getUserIdFromRequest(request);
    if (!clerkOrApiUserId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: clerkOrApiUserId },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const { id: projectId } = await params;
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: user.id },
      select: { id: true, domain: true, name: true },
    });
    if (!project) {
      return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const defaults = defaultDateRange();
    const startDate = typeof body.startDate === "string" ? body.startDate : defaults.startDate;
    const endDate = typeof body.endDate === "string" ? body.endDate : defaults.endDate;
    const siteUrl = normalizeSiteUrl(
      typeof body.siteUrl === "string" ? body.siteUrl : "",
      project.domain
    );

    const [queries, pages, countries, devices] = await Promise.all([
      fetchGscDimension({ siteUrl, startDate, endDate, dimension: "query", rowLimit: 25 }),
      fetchGscDimension({ siteUrl, startDate, endDate, dimension: "page", rowLimit: 25 }),
      fetchGscDimension({ siteUrl, startDate, endDate, dimension: "country", rowLimit: 10 }),
      fetchGscDimension({ siteUrl, startDate, endDate, dimension: "device", rowLimit: 10 }),
    ]);

    const queryRows = queries.rows ?? [];
    const summary = summarizeRows(queryRows);

    return NextResponse.json({
      success: true,
      data: {
        siteUrl,
        projectName: project.name,
        range: { startDate, endDate },
        summary,
        topQueries: queryRows.map((r) => ({
          query: r.keys?.[0] ?? "",
          clicks: r.clicks ?? 0,
          impressions: r.impressions ?? 0,
          ctr: (r.ctr ?? 0) * 100,
          position: r.position ?? 0,
        })),
        topPages: (pages.rows ?? []).map((r) => ({
          page: r.keys?.[0] ?? "",
          clicks: r.clicks ?? 0,
          impressions: r.impressions ?? 0,
          ctr: (r.ctr ?? 0) * 100,
          position: r.position ?? 0,
        })),
        countries: (countries.rows ?? []).map((r) => ({
          country: r.keys?.[0] ?? "",
          clicks: r.clicks ?? 0,
          impressions: r.impressions ?? 0,
          ctr: (r.ctr ?? 0) * 100,
          position: r.position ?? 0,
        })),
        devices: (devices.rows ?? []).map((r) => ({
          device: r.keys?.[0] ?? "",
          clicks: r.clicks ?? 0,
          impressions: r.impressions ?? 0,
          ctr: (r.ctr ?? 0) * 100,
          position: r.position ?? 0,
        })),
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

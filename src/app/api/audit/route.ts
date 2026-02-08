import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { auditSinglePage, getGrade, type AuditIssue } from "@/lib/audit";
import { getUrlsFromSitemap, discoverInternalLinks } from "@/lib/crawler";

const schema = z.object({
  url: z.string().url(),
  projectId: z.string().optional(),
  crawlType: z.enum(["single", "fullsite"]).optional().default("single"),
  maxPages: z.number().min(1).max(100).optional().default(25),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, projectId, crawlType, maxPages } = schema.parse(body);

    let urlsToAudit: string[] = [url];

    if (crawlType === "fullsite") {
      const sitemapUrls = await getUrlsFromSitemap(url);
      if (sitemapUrls.length > 0) {
        urlsToAudit = sitemapUrls.slice(0, maxPages);
      } else {
        const res = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; AlChemistSEO/1.0)" },
        });
        const html = await res.text();
        const links = await discoverInternalLinks(url, html);
        urlsToAudit = [url, ...links.slice(0, maxPages - 1)];
      }
    }

    const results: { url: string; score: number; issues: AuditIssue[] }[] = [];
    for (const u of urlsToAudit) {
      const r = await auditSinglePage(u);
      results.push({ url: u, ...r });
    }

    const avgScore = Math.round(
      results.reduce((a, r) => a + r.score, 0) / results.length
    );
    const grade = getGrade(avgScore);

    const allIssues: (AuditIssue & { url: string })[] = results.flatMap((r) =>
      r.issues.map((i) => ({ ...i, url: r.url }))
    );
    const issuesByKey = new Map<
      string,
      { issue: AuditIssue; count: number }
    >();
    for (const i of allIssues) {
      const key = `${i.category}|||${i.message}`;
      const existing = issuesByKey.get(key);
      if (existing) {
        existing.count++;
      } else {
        issuesByKey.set(key, { issue: i, count: 1 });
      }
    }

    const aggregatedIssues: AuditIssue[] = Array.from(issuesByKey.values())
      .filter(({ count }) => count >= Math.ceil(results.length * 0.2))
      .map(({ issue, count }) => ({
        type: issue.type,
        category: issue.category,
        message: `${issue.message} (${count}/${results.length} pages)`,
        details: issue.details,
        weight: issue.weight,
      }));

    const { userId } = await auth();
    if (userId) {
      let user = await prisma.user.findUnique({ where: { clerkId: userId } });
      if (!user) {
        user = await prisma.user.create({
          data: { clerkId: userId, email: `${userId}@clerk.user` },
        });
      }

      await prisma.auditRun.create({
        data: {
          url,
          userId: user.id,
          projectId: projectId || null,
          status: "completed",
          score: avgScore,
          grade,
          issues: JSON.stringify(
            crawlType === "single" ? results[0].issues : aggregatedIssues
          ),
          pagesCount: results.length,
          crawlType,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        url,
        score: avgScore,
        grade,
        issues: crawlType === "single" ? results[0].issues : aggregatedIssues,
        pagesAudited: results.length,
        crawlType,
        pageResults: crawlType === "fullsite" ? results : undefined,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

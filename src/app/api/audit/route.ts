import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

const schema = z.object({
  url: z.string().url(),
  projectId: z.string().optional(),
});

type AuditIssue = {
  type: "error" | "warning" | "info";
  category: string;
  message: string;
  details?: string;
};

async function runAudit(url: string): Promise<{ score: number; issues: AuditIssue[] }> {
  const issues: AuditIssue[] = [];
  let score = 100;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SEOAudit/1.0)",
      },
    });

    const html = await response.text();

    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    if (!titleMatch) {
      issues.push({
        type: "error",
        category: "On-Page",
        message: "Missing page title",
        details: "Pages should have a unique, descriptive title tag.",
      });
      score -= 15;
    } else {
      const title = titleMatch[1].trim();
      if (title.length < 30) {
        issues.push({
          type: "warning",
          category: "On-Page",
          message: "Title too short",
          details: `Title is ${title.length} chars. Recommended: 50-60 characters.`,
        });
        score -= 5;
      } else if (title.length > 60) {
        issues.push({
          type: "warning",
          category: "On-Page",
          message: "Title too long",
          details: `Title is ${title.length} chars. May be truncated in SERPs.`,
        });
        score -= 5;
      }
    }

    const metaDescMatch = html.match(
      /<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i
    );
    if (!metaDescMatch) {
      issues.push({
        type: "warning",
        category: "On-Page",
        message: "Missing meta description",
        details: "Add a meta description for better SERP snippets.",
      });
      score -= 10;
    } else {
      const desc = metaDescMatch[1].trim();
      if (desc.length < 120) {
        issues.push({
          type: "info",
          category: "On-Page",
          message: "Meta description could be longer",
          details: `Current: ${desc.length} chars. Recommended: 150-160.`,
        });
        score -= 3;
      }
    }

    const h1Match = html.match(/<h1[^>]*>([^<]*)<\/h1>/i);
    if (!h1Match) {
      issues.push({
        type: "warning",
        category: "On-Page",
        message: "Missing H1 heading",
        details: "Pages should have exactly one H1 for structure.",
      });
      score -= 8;
    }

    const canonicalMatch = html.match(
      /<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i
    );
    if (!canonicalMatch) {
      issues.push({
        type: "info",
        category: "Technical",
        message: "No canonical URL",
        details: "Consider adding a canonical link for duplicate content.",
      });
      score -= 2;
    }

    if (!html.includes("viewport")) {
      issues.push({
        type: "error",
        category: "Mobile",
        message: "Missing viewport meta tag",
        details: "Required for mobile-friendly pages.",
      });
      score -= 12;
    }

    const robotsMatch = html.match(
      /<meta[^>]*name=["']robots["'][^>]*content=["']([^"']*)["']/i
    );
    if (robotsMatch && /noindex/i.test(robotsMatch[1])) {
      issues.push({
        type: "warning",
        category: "Technical",
        message: "Page has noindex",
        details: "This page will not be indexed by search engines.",
      });
      score -= 20;
    }

    if (!html.includes("og:title") && !html.includes("og:image")) {
      issues.push({
        type: "info",
        category: "Social",
        message: "Missing Open Graph tags",
        details: "Add og:title, og:description, og:image for social sharing.",
      });
      score -= 3;
    }

    score = Math.max(0, score);
  } catch (error) {
    issues.push({
      type: "error",
      category: "Crawl",
      message: "Failed to fetch URL",
      details: error instanceof Error ? error.message : "Unknown error",
    });
    score = 0;
  }

  return { score, issues };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, projectId } = schema.parse(body);

    const { score, issues } = await runAudit(url);
    const grade =
      score >= 90 ? "A" : score >= 70 ? "B" : score >= 50 ? "C" : score >= 30 ? "D" : "F";

    // Save audit to DB if user is logged in
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
          score,
          grade,
          issues: JSON.stringify(issues),
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        url,
        score,
        issues,
        grade,
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

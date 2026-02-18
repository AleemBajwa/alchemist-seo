import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import {
  auditSinglePage,
  getGrade,
  getPageSpeedMetrics,
  traceRedirectChain,
  type AuditIssue,
} from "@/lib/audit";
import { crawlSiteUrls } from "@/lib/crawler";

const schema = z.object({
  url: z.string().url(),
  projectId: z.string().optional(),
  focusKeyword: z.string().min(2).max(200).optional(),
  crawlType: z.enum(["single", "fullsite"]).optional().default("single"),
  maxPages: z.number().min(1).max(100).optional().default(25),
});

function normalizeAuditUrl(raw: string): string {
  try {
    const u = new URL(raw);
    u.hash = "";
    if (u.pathname !== "/" && u.pathname.endsWith("/")) {
      u.pathname = u.pathname.slice(0, -1);
    }
    return u.href;
  } catch {
    return raw;
  }
}

function jaccard(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const aSet = new Set(a);
  const bSet = new Set(b);
  let intersect = 0;
  for (const term of aSet) {
    if (bSet.has(term)) intersect++;
  }
  const union = new Set([...aSet, ...bSet]).size;
  return union === 0 ? 0 : intersect / union;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, projectId, focusKeyword, crawlType, maxPages } = schema.parse(body);

    let urlsToAudit: string[] = [url];
    let crawlSource: "single" | "sitemap" | "bfs" = "single";

    if (crawlType === "fullsite") {
      try {
        const crawled = await crawlSiteUrls({ startUrl: url, maxPages: maxPages ?? 25 });
        urlsToAudit = crawled.urls.length > 0 ? crawled.urls : [url];
        crawlSource = crawled.source;
      } catch (crawlError) {
        console.error("Crawl error:", crawlError);
        urlsToAudit = [url];
        crawlSource = "single";
      }
    }

    const results: {
      url: string;
      score: number;
      issues: AuditIssue[];
      signals?: {
        title: string | null;
        metaDescription: string | null;
        contentFingerprint: string;
        internalLinksCount: number;
        wordCount: number;
        topTerms: string[];
        outgoingInternalLinks: string[];
      };
    }[] = [];
    for (const u of urlsToAudit) {
      try {
        const r = await auditSinglePage(u, focusKeyword);
        results.push({ url: u, ...r });
      } catch (pageError) {
        console.error(`Failed to audit ${u}:`, pageError);
        results.push({
          url: u,
          score: 0,
          issues: [{
            type: "error",
            category: "Crawl",
            message: "Failed to audit this page",
            details: pageError instanceof Error ? pageError.message : "Unknown error",
            weight: 100,
          }],
        });
      }
    }

    if (results.length === 0) {
      return NextResponse.json(
        { success: false, error: "AUDIT_FAILED", message: "No pages could be audited" },
        { status: 500 }
      );
    }

    const avgScore = Math.round(
      results.reduce((a, r) => a + r.score, 0) / results.length
    );
    let finalScore = avgScore;

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

    let technicalSummary: {
      crawlSource: string;
      orphanPageUrls: string[];
      redirectChainExamples: string[];
      duplicateTitleGroups: Array<{ title: string; count: number; urls: string[] }>;
      duplicateMetaGroups: Array<{ meta: string; count: number; urls: string[] }>;
    } | undefined;
    let orphanPageUrls: string[] = [];
    let duplicateTitleGroups: Array<{ title: string; count: number; urls: string[] }> = [];
    let duplicateMetaGroups: Array<{ meta: string; count: number; urls: string[] }> = [];

    if (crawlType === "fullsite" && results.length > 1) {
      const titleCounts = new Map<string, number>();
      const metaCounts = new Map<string, number>();
      const titleToUrls = new Map<string, string[]>();
      const metaToUrls = new Map<string, string[]>();
      const contentCounts = new Map<string, number>();
      for (const r of results) {
        const normUrl = normalizeAuditUrl(r.url);
        const title = r.signals?.title?.trim().toLowerCase();
        const meta = r.signals?.metaDescription?.trim().toLowerCase();
        const content = r.signals?.contentFingerprint?.trim();
        if (title) {
          titleCounts.set(title, (titleCounts.get(title) ?? 0) + 1);
          if (!titleToUrls.has(title)) titleToUrls.set(title, []);
          titleToUrls.get(title)!.push(normUrl);
        }
        if (meta) {
          metaCounts.set(meta, (metaCounts.get(meta) ?? 0) + 1);
          if (!metaToUrls.has(meta)) metaToUrls.set(meta, []);
          metaToUrls.get(meta)!.push(normUrl);
        }
        if (content) contentCounts.set(content, (contentCounts.get(content) ?? 0) + 1);
      }

      const duplicateTitles = [...titleCounts.values()].filter((v) => v > 1).length;
      const duplicateMeta = [...metaCounts.values()].filter((v) => v > 1).length;
      const duplicateContent = [...contentCounts.values()].filter((v) => v > 1).length;
      const veryLowInternalLinkPages = results.filter((r) => (r.signals?.internalLinksCount ?? 0) <= 1).length;
      const thinPages = results.filter((r) => (r.signals?.wordCount ?? 0) > 0 && (r.signals?.wordCount ?? 0) < 250).length;

      if (duplicateTitles > 0) {
        aggregatedIssues.push({
          type: "warning",
          category: "On-Page",
          message: `Duplicate title tags detected (${duplicateTitles} clusters)`,
          details: "Use unique title tags per page for clearer relevance signals.",
          weight: 7,
        });
      }
      if (duplicateMeta > 0) {
        aggregatedIssues.push({
          type: "warning",
          category: "On-Page",
          message: `Duplicate meta descriptions detected (${duplicateMeta} clusters)`,
          details: "Unique descriptions improve snippet quality and CTR.",
          weight: 6,
        });
      }
      if (duplicateContent > 0) {
        aggregatedIssues.push({
          type: "warning",
          category: "Content",
          message: `Potential duplicate content detected (${duplicateContent} clusters)`,
          details: "Similar page bodies can cannibalize rankings.",
          weight: 8,
        });
      }
      if (veryLowInternalLinkPages > 0) {
        aggregatedIssues.push({
          type: "info",
          category: "Internal Linking",
          message: `Potential orphan/weakly linked pages (${veryLowInternalLinkPages}/${results.length})`,
          details: "Pages with very few internal links may receive weaker crawl and ranking signals.",
          weight: 4,
        });
      }
      if (thinPages > 0) {
        aggregatedIssues.push({
          type: thinPages > Math.ceil(results.length * 0.35) ? "warning" : "info",
          category: "Content",
          message: `Thin pages across site (${thinPages}/${results.length})`,
          details:
            "A high share of low-word-count pages can limit topical depth and ranking potential.",
          weight: thinPages > Math.ceil(results.length * 0.35) ? 7 : 4,
        });
        finalScore = Math.max(
          0,
          finalScore - (thinPages > Math.ceil(results.length * 0.35) ? 5 : 2)
        );
      }

      if (crawlSource === "bfs") {
        aggregatedIssues.push({
          type: "info",
          category: "Crawl",
          message: "Sitemap not found, used live link crawling",
          details:
            "Audit URLs were discovered via internal-link BFS crawl. Add a complete sitemap.xml for more reliable coverage.",
          weight: 2,
        });
      }

      const normalizedPages = results.map((r) => normalizeAuditUrl(r.url));
      const pageSet = new Set(normalizedPages);
      const inDegree = new Map<string, number>();
      for (const p of normalizedPages) {
        inDegree.set(p, 0);
      }
      for (const r of results) {
        const source = normalizeAuditUrl(r.url);
        const links = r.signals?.outgoingInternalLinks ?? [];
        for (const link of links) {
          const target = normalizeAuditUrl(link);
          if (!pageSet.has(target) || target === source) continue;
          inDegree.set(target, (inDegree.get(target) ?? 0) + 1);
        }
      }
      const root = normalizeAuditUrl(url);
      const orphanPages = [...inDegree.entries()].filter(
        ([page, deg]) => page !== root && deg === 0
      );
      if (orphanPages.length > 0) {
        aggregatedIssues.push({
          type: "warning",
          category: "Internal Linking",
          message: `Orphan page candidates detected (${orphanPages.length}/${results.length})`,
          details: `Examples: ${orphanPages
            .slice(0, 4)
            .map(([p]) => p)
            .join(" | ")}`,
          weight: 8,
        });
        finalScore = Math.max(0, finalScore - 6);
      }

      duplicateTitleGroups = [...titleToUrls.entries()]
        .filter(([, urls]) => urls.length > 1)
        .map(([title, urls]) => ({ title, count: urls.length, urls }));
      duplicateMetaGroups = [...metaToUrls.entries()]
        .filter(([, urls]) => urls.length > 1)
        .map(([meta, urls]) => ({ meta, count: urls.length, urls }));
      orphanPageUrls = orphanPages.map(([p]) => p);

      let nearDuplicatePairs = 0;
      const nearDuplicateExamples: string[] = [];
      for (let i = 0; i < results.length; i++) {
        for (let j = i + 1; j < results.length; j++) {
          const left = results[i];
          const right = results[j];
          const leftWords = left.signals?.wordCount ?? 0;
          const rightWords = right.signals?.wordCount ?? 0;
          if (leftWords < 120 || rightWords < 120) continue;
          const similarity = jaccard(
            left.signals?.topTerms ?? [],
            right.signals?.topTerms ?? []
          );
          if (similarity >= 0.72) {
            nearDuplicatePairs++;
            if (nearDuplicateExamples.length < 3) {
              nearDuplicateExamples.push(
                `${normalizeAuditUrl(left.url)} ~ ${normalizeAuditUrl(right.url)}`
              );
            }
          }
        }
      }
      if (nearDuplicatePairs > 0) {
        aggregatedIssues.push({
          type: "warning",
          category: "Content",
          message: `Near-duplicate content pairs detected (${nearDuplicatePairs})`,
          details:
            nearDuplicateExamples.length > 0
              ? `Examples: ${nearDuplicateExamples.join(" | ")}`
              : "Multiple pages appear highly similar in topical term distribution.",
          weight: 9,
        });
        finalScore = Math.max(0, finalScore - 7);
      }
    }

    const redirectTraceSample = results.slice(0, Math.min(results.length, 30));
    let redirectingPages = 0;
    let longRedirectChains = 0;
    const chainExamples: string[] = [];
    for (const page of redirectTraceSample) {
      try {
        const trace = await traceRedirectChain(page.url, 8);
        if (trace.hops > 0) {
          redirectingPages++;
          if (trace.hops >= 2) {
            longRedirectChains++;
          }
          if (chainExamples.length < 3) {
            chainExamples.push(trace.chain.join(" -> "));
          }
        }
        if (trace.hasLoop) {
          aggregatedIssues.push({
            type: "error",
            category: "Technical",
            message: "Potential redirect loop detected",
            details: `Redirect trace sample: ${trace.chain.join(" -> ")}`,
            weight: 12,
          });
          finalScore = Math.max(0, finalScore - 8);
        }
      } catch {
        // Skip redirect trace if it fails
        continue;
      }
    }

    if (redirectingPages > 0) {
      aggregatedIssues.push({
        type: longRedirectChains > 0 ? "warning" : "info",
        category: "Technical",
        message:
          longRedirectChains > 0
            ? `Multi-hop redirect chains found (${longRedirectChains}/${redirectTraceSample.length} sampled pages)`
            : `Redirects detected (${redirectingPages}/${redirectTraceSample.length} sampled pages)`,
        details:
          chainExamples.length > 0
            ? `Examples: ${chainExamples.join(" | ")}`
            : "Some pages redirect before reaching final destination.",
        weight: longRedirectChains > 0 ? 7 : 4,
      });
      if (longRedirectChains > 0) {
        finalScore = Math.max(0, finalScore - 5);
      } else {
        finalScore = Math.max(0, finalScore - 2);
      }
    }

    if (crawlType === "fullsite" && results.length > 1) {
      technicalSummary = {
        crawlSource,
        orphanPageUrls,
        redirectChainExamples: chainExamples,
        duplicateTitleGroups,
        duplicateMetaGroups,
      };
    }

    let mobileMetrics: Awaited<ReturnType<typeof getPageSpeedMetrics>> = null;
    let desktopMetrics: Awaited<ReturnType<typeof getPageSpeedMetrics>> = null;
    try {
      [mobileMetrics, desktopMetrics] = await Promise.all([
        getPageSpeedMetrics(url, "mobile"),
        getPageSpeedMetrics(url, "desktop"),
      ]);
    } catch {
      // PageSpeed metrics are optional, continue without them
    }

    const pageSpeedIssues: AuditIssue[] = [];

    if (mobileMetrics?.performanceScore != null && mobileMetrics.performanceScore < 50) {
      aggregatedIssues.push({
        type: "warning",
        category: "Core Web Vitals",
        message: "Low mobile performance score",
        details: `PageSpeed mobile score is ${mobileMetrics.performanceScore}/100.`,
        weight: 10,
      });
      pageSpeedIssues.push({
        type: "warning",
        category: "Core Web Vitals",
        message: "Low mobile performance score",
        details: `PageSpeed mobile score is ${mobileMetrics.performanceScore}/100.`,
        weight: 10,
      });
      finalScore = Math.max(0, finalScore - 8);
    }
    if (mobileMetrics?.lcpMs != null && mobileMetrics.lcpMs > 4000) {
      aggregatedIssues.push({
        type: "warning",
        category: "Core Web Vitals",
        message: "LCP is slower than recommended",
        details: `Largest Contentful Paint is ${Math.round(mobileMetrics.lcpMs)}ms (target under 2500ms).`,
        weight: 8,
      });
      pageSpeedIssues.push({
        type: "warning",
        category: "Core Web Vitals",
        message: "LCP is slower than recommended",
        details: `Largest Contentful Paint is ${Math.round(mobileMetrics.lcpMs)}ms (target under 2500ms).`,
        weight: 8,
      });
      finalScore = Math.max(0, finalScore - 6);
    }
    if (mobileMetrics?.cls != null && mobileMetrics.cls > 0.25) {
      aggregatedIssues.push({
        type: "warning",
        category: "Core Web Vitals",
        message: "CLS indicates layout instability",
        details: `Cumulative Layout Shift is ${mobileMetrics.cls.toFixed(3)} (target under 0.1).`,
        weight: 7,
      });
      pageSpeedIssues.push({
        type: "warning",
        category: "Core Web Vitals",
        message: "CLS indicates layout instability",
        details: `Cumulative Layout Shift is ${mobileMetrics.cls.toFixed(3)} (target under 0.1).`,
        weight: 7,
      });
      finalScore = Math.max(0, finalScore - 5);
    }
    if (mobileMetrics?.isMobileFriendly === false) {
      aggregatedIssues.push({
        type: "warning",
        category: "Mobile",
        message: "Mobile friendliness issues detected",
        details: "Viewport/tap-target signals indicate the page may not be fully mobile friendly.",
        weight: 8,
      });
      pageSpeedIssues.push({
        type: "warning",
        category: "Mobile",
        message: "Mobile friendliness issues detected",
        details: "Viewport/tap-target signals indicate the page may not be fully mobile friendly.",
        weight: 8,
      });
      finalScore = Math.max(0, finalScore - 5);
    }

    const grade = getGrade(finalScore);

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
          score: finalScore,
          grade,
          issues: JSON.stringify(
            crawlType === "single"
              ? [...results[0].issues, ...pageSpeedIssues]
              : aggregatedIssues
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
        score: finalScore,
        grade,
        issues:
          crawlType === "single"
            ? [...results[0].issues, ...pageSpeedIssues]
            : aggregatedIssues,
        pagesAudited: results.length,
        crawlType,
        crawlSource,
        technicalSummary: technicalSummary ?? undefined,
        pageResults: crawlType === "fullsite" ? results : undefined,
        pageSpeed: {
          mobile: mobileMetrics,
          desktop: desktopMetrics,
        },
        focusKeyword: focusKeyword ?? null,
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

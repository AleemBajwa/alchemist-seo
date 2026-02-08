/**
 * Shared audit logic - single page & full-site
 * Weighted scoring based on SEO impact
 */

export type AuditIssue = {
  type: "error" | "warning" | "info";
  category: string;
  message: string;
  details?: string;
  weight: number;
};

const WEIGHTS = {
  titleMissing: 18,
  titleShort: 6,
  titleLong: 4,
  metaDescMissing: 12,
  metaDescShort: 4,
  h1Missing: 10,
  canonicalMissing: 3,
  viewportMissing: 15,
  noindex: 25,
  ogMissing: 4,
  h1Multiple: 5,
  structuredDataMissing: 5,
  faviconMissing: 2,
  crawlFail: 100,
} as const;

export async function auditSinglePage(
  url: string
): Promise<{ score: number; issues: AuditIssue[] }> {
  const issues: AuditIssue[] = [];
  let deductions = 0;

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AlChemistSEO/1.0)" },
    });
    const html = await response.text();

    // Title
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    if (!titleMatch) {
      issues.push({
        type: "error",
        category: "On-Page",
        message: "Missing page title",
        details: "Pages should have a unique, descriptive title tag.",
        weight: WEIGHTS.titleMissing,
      });
      deductions += WEIGHTS.titleMissing;
    } else {
      const title = titleMatch[1].trim();
      if (title.length < 30) {
        issues.push({
          type: "warning",
          category: "On-Page",
          message: "Title too short",
          details: `Title is ${title.length} chars. Recommended: 50-60 characters.`,
          weight: WEIGHTS.titleShort,
        });
        deductions += WEIGHTS.titleShort;
      } else if (title.length > 60) {
        issues.push({
          type: "warning",
          category: "On-Page",
          message: "Title too long",
          details: `Title is ${title.length} chars. May be truncated in SERPs.`,
          weight: WEIGHTS.titleLong,
        });
        deductions += WEIGHTS.titleLong;
      }
    }

    // Meta description
    const metaDescMatch = html.match(
      /<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i
    );
    if (!metaDescMatch) {
      issues.push({
        type: "warning",
        category: "On-Page",
        message: "Missing meta description",
        details: "Add a meta description for better SERP snippets.",
        weight: WEIGHTS.metaDescMissing,
      });
      deductions += WEIGHTS.metaDescMissing;
    } else {
      const desc = metaDescMatch[1].trim();
      if (desc.length < 120) {
        issues.push({
          type: "info",
          category: "On-Page",
          message: "Meta description could be longer",
          details: `Current: ${desc.length} chars. Recommended: 150-160.`,
          weight: WEIGHTS.metaDescShort,
        });
        deductions += WEIGHTS.metaDescShort;
      }
    }

    // H1
    const h1Matches = html.match(/<h1[^>]*>([^<]*)<\/h1>/gi);
    if (!h1Matches || h1Matches.length === 0) {
      issues.push({
        type: "warning",
        category: "On-Page",
        message: "Missing H1 heading",
        details: "Pages should have exactly one H1 for structure.",
        weight: WEIGHTS.h1Missing,
      });
      deductions += WEIGHTS.h1Missing;
    } else if (h1Matches.length > 1) {
      issues.push({
        type: "info",
        category: "On-Page",
        message: "Multiple H1 headings",
        details: `Found ${h1Matches.length} H1s. Consider using a single H1 per page.`,
        weight: WEIGHTS.h1Multiple,
      });
      deductions += WEIGHTS.h1Multiple;
    }

    // Canonical
    const canonicalMatch = html.match(
      /<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i
    );
    if (!canonicalMatch) {
      issues.push({
        type: "info",
        category: "Technical",
        message: "No canonical URL",
        details: "Consider adding a canonical link for duplicate content.",
        weight: WEIGHTS.canonicalMissing,
      });
      deductions += WEIGHTS.canonicalMissing;
    }

    // Viewport
    if (!html.includes("viewport")) {
      issues.push({
        type: "error",
        category: "Mobile",
        message: "Missing viewport meta tag",
        details: "Required for mobile-friendly pages.",
        weight: WEIGHTS.viewportMissing,
      });
      deductions += WEIGHTS.viewportMissing;
    }

    // Robots
    const robotsMatch = html.match(
      /<meta[^>]*name=["']robots["'][^>]*content=["']([^"']*)["']/i
    );
    if (robotsMatch && /noindex/i.test(robotsMatch[1])) {
      issues.push({
        type: "warning",
        category: "Technical",
        message: "Page has noindex",
        details: "This page will not be indexed by search engines.",
        weight: WEIGHTS.noindex,
      });
      deductions += WEIGHTS.noindex;
    }

    // Open Graph
    if (!html.includes("og:title") && !html.includes("og:image")) {
      issues.push({
        type: "info",
        category: "Social",
        message: "Missing Open Graph tags",
        details: "Add og:title, og:description, og:image for social sharing.",
        weight: WEIGHTS.ogMissing,
      });
      deductions += WEIGHTS.ogMissing;
    }

    // Structured data
    if (!html.includes("application/ld+json") && !html.includes('type="application/ld+json"')) {
      issues.push({
        type: "info",
        category: "Technical",
        message: "No structured data (JSON-LD)",
        details: "Schema.org markup can improve rich snippets in SERPs.",
        weight: WEIGHTS.structuredDataMissing,
      });
      deductions += WEIGHTS.structuredDataMissing;
    }

    // Favicon
    if (!html.includes("favicon") && !html.includes("icon")) {
      issues.push({
        type: "info",
        category: "Technical",
        message: "No favicon detected",
        details: "Improves brand recognition in browser tabs.",
        weight: WEIGHTS.faviconMissing,
      });
      deductions += WEIGHTS.faviconMissing;
    }

    const score = Math.max(0, 100 - deductions);
    return { score, issues };
  } catch (error) {
    issues.push({
      type: "error",
      category: "Crawl",
      message: "Failed to fetch URL",
      details: error instanceof Error ? error.message : "Unknown error",
      weight: WEIGHTS.crawlFail,
    });
    return { score: 0, issues };
  }
}

export function getGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 70) return "B";
  if (score >= 50) return "C";
  if (score >= 30) return "D";
  return "F";
}

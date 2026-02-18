/**
 * SEOPTimer-like comprehensive SEO audit - 100% self-contained, NO API calls
 * All checks performed by fetching HTML and analyzing locally
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
  h1Multiple: 5,
  canonicalMissing: 3,
  viewportMissing: 15,
  noindex: 25,
  ogMissing: 4,
  structuredDataMissing: 5,
  faviconMissing: 2,
  crawlFail: 100,
  imagesNoAlt: 8,
  h2Missing: 3,
  linksBroken: 6,
  httpsMissing: 20,
  langMissing: 4,
  charsetMissing: 5,
  robotsTxtMissing: 3,
  sitemapMissing: 2,
  internalLinksLow: 2,
  externalLinks: 1,
  metaKeywords: 1,
  duplicateContent: 6,
  thinContent: 8,
  headingStructure: 4,
  anchorTextGeneric: 3,
  pageSpeedSlow: 6,
  redirectChain: 4,
  brokenLinks: 8,
  focusKeywordMissing: 8,
  focusKeywordWeak: 4,
  focusKeywordHeading: 3,
  imageLargeFiles: 7,
  imageMissingDimensions: 4,
} as const;

export async function auditSinglePage(
  url: string,
  focusKeyword?: string
): Promise<{
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
}> {
  const issues: AuditIssue[] = [];
  let deductions = 0;

  try {
    const parsedUrl = new URL(url.startsWith("http") ? url : `https://${url}`);
    if (!parsedUrl.protocol.startsWith("https")) {
      issues.push({
        type: "error",
        category: "Security",
        message: "Site not using HTTPS",
        details: "HTTPS improves security and is a ranking factor.",
        weight: WEIGHTS.httpsMissing,
      });
      deductions += WEIGHTS.httpsMissing;
    }

    const startedAt = Date.now();
    const response = await fetch(parsedUrl.href, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AlChemistSEO/1.0)" },
    });
    const responseMs = Date.now() - startedAt;
    const html = await response.text();

    if (response.redirected) {
      issues.push({
        type: "info",
        category: "Technical",
        message: "URL redirects before final page",
        details: "Redirect chains can dilute crawl efficiency and page signals.",
        weight: WEIGHTS.redirectChain,
      });
      deductions += WEIGHTS.redirectChain;
    }

    if (responseMs > 1800) {
      issues.push({
        type: "warning",
        category: "Performance",
        message: "Slow initial response",
        details: `Server responded in ${responseMs}ms. Consider improving server and page speed.`,
        weight: WEIGHTS.pageSpeedSlow,
      });
      deductions += WEIGHTS.pageSpeedSlow;
    }

    // Charset
    if (!html.includes("charset") && !html.includes("encoding")) {
      issues.push({
        type: "info",
        category: "Technical",
        message: "No charset declaration",
        details: "Add charset in meta tag for proper character encoding.",
        weight: WEIGHTS.charsetMissing,
      });
      deductions += WEIGHTS.charsetMissing;
    }

    // Lang attribute
    const htmlMatch = html.match(/<html[^>]*>/i);
    if (htmlMatch && !/lang\s*=/i.test(htmlMatch[0])) {
      issues.push({
        type: "info",
        category: "Technical",
        message: "Missing lang attribute on html",
        details: "Add lang attribute (e.g. lang='en') for accessibility.",
        weight: WEIGHTS.langMissing,
      });
      deductions += WEIGHTS.langMissing;
    }

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

    // Meta keywords (deprecated - info only)
    if (html.match(/<meta[^>]*name=["']keywords["']/i)) {
      issues.push({
        type: "info",
        category: "On-Page",
        message: "Meta keywords tag present",
        details: "Google ignores meta keywords. Consider removing.",
        weight: WEIGHTS.metaKeywords,
      });
      deductions += WEIGHTS.metaKeywords;
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

    // H2 - content structure
    const h2Matches = html.match(/<h2[^>]*>/gi);
    if (!h2Matches || h2Matches.length === 0) {
      issues.push({
        type: "info",
        category: "On-Page",
        message: "No H2 headings",
        details: "Use H2 subheadings for better content structure.",
        weight: WEIGHTS.h2Missing,
      });
      deductions += WEIGHTS.h2Missing;
    }

    const h3Matches = html.match(/<h3[^>]*>/gi);
    if (h3Matches && h3Matches.length > 0 && (!h2Matches || h2Matches.length === 0)) {
      issues.push({
        type: "info",
        category: "On-Page",
        message: "Heading hierarchy may be inconsistent",
        details: "H3 headings found without H2 structure. Keep heading levels sequential.",
        weight: WEIGHTS.headingStructure,
      });
      deductions += WEIGHTS.headingStructure;
    }

    // Images without alt
    const imgTags = html.match(/<img[^>]*>/gi) || [];
    let imgsWithoutAlt = 0;
    let imgsMissingDimensions = 0;
    const imageSrcCandidates: string[] = [];
    for (const tag of imgTags) {
      const altMatch = tag.match(/alt\s*=\s*["']([^"']*)["']/i);
      if (!altMatch || !altMatch[1].trim()) imgsWithoutAlt++;
      const hasWidth = /width\s*=\s*["']?\d+/i.test(tag);
      const hasHeight = /height\s*=\s*["']?\d+/i.test(tag);
      if (!hasWidth || !hasHeight) imgsMissingDimensions++;
      const srcMatch = tag.match(/src\s*=\s*["']([^"']+)["']/i);
      if (srcMatch?.[1]) imageSrcCandidates.push(srcMatch[1].trim());
    }
    const totalImgs = imgTags.length;
    if (totalImgs > 0 && imgsWithoutAlt > 0) {
      issues.push({
        type: "warning",
        category: "Accessibility",
        message: "Images missing alt text",
        details: `${imgsWithoutAlt} of ${totalImgs} images lack alt attributes.`,
        weight: Math.min(WEIGHTS.imagesNoAlt, imgsWithoutAlt * 2),
      });
      deductions += Math.min(WEIGHTS.imagesNoAlt, imgsWithoutAlt * 2);
    }
    if (totalImgs > 0 && imgsMissingDimensions > 0) {
      issues.push({
        type: "info",
        category: "Image SEO",
        message: "Images missing explicit dimensions",
        details: `${imgsMissingDimensions} of ${totalImgs} images have no width/height attributes.`,
        weight: WEIGHTS.imageMissingDimensions,
      });
      deductions += WEIGHTS.imageMissingDimensions;
    }

    // Image size sampling (best effort via HEAD content-length)
    const uniqueImages = [...new Set(imageSrcCandidates)].slice(0, 8);
    let oversizedImages = 0;
    for (const imgSrc of uniqueImages) {
      try {
        const full = new URL(imgSrc, parsedUrl.href);
        if (full.origin !== parsedUrl.origin) continue;
        const imgRes = await fetch(full.href, {
          method: "HEAD",
          headers: { "User-Agent": "Mozilla/5.0 (compatible; AlChemistSEO/1.0)" },
        });
        const len = Number(imgRes.headers.get("content-length") ?? 0);
        if (Number.isFinite(len) && len > 350_000) oversizedImages++;
      } catch {
        continue;
      }
    }
    if (oversizedImages > 0) {
      issues.push({
        type: "warning",
        category: "Image SEO",
        message: "Large image files detected",
        details: `${oversizedImages} sampled images exceed ~350KB. Compress or modernize formats (WebP/AVIF).`,
        weight: WEIGHTS.imageLargeFiles,
      });
      deductions += WEIGHTS.imageLargeFiles;
    }

    // Thin content check
    const textContent = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const wordCount = textContent ? textContent.split(/\s+/).length : 0;
    if (wordCount > 0 && wordCount < 250) {
      issues.push({
        type: "warning",
        category: "Content",
        message: "Thin content detected",
        details: `Only ${wordCount} visible words found. Consider adding deeper topical coverage.`,
        weight: WEIGHTS.thinContent,
      });
      deductions += WEIGHTS.thinContent;
    }

    // Optional focus keyword presence check
    const normalizedFocusKeyword = focusKeyword?.trim().toLowerCase();
    if (normalizedFocusKeyword) {
      const normalizedText = textContent.toLowerCase();
      const bodyMatches = normalizedText.split(normalizedFocusKeyword).length - 1;
      const headingMatches = [...html.matchAll(/<(h1|h2|h3)[^>]*>([\s\S]*?)<\/\1>/gim)]
        .map((m) => (m[2] ?? "").replace(/<[^>]+>/g, " ").toLowerCase())
        .filter((h) => h.includes(normalizedFocusKeyword)).length;

      if (bodyMatches === 0) {
        issues.push({
          type: "warning",
          category: "Content",
          message: "Focus keyword not found in page body",
          details: `The focus keyword "${focusKeyword}" was not detected in visible page text.`,
          weight: WEIGHTS.focusKeywordMissing,
        });
        deductions += WEIGHTS.focusKeywordMissing;
      } else if (bodyMatches < 2 && wordCount > 350) {
        issues.push({
          type: "info",
          category: "Content",
          message: "Focus keyword appears weakly in content",
          details: `Detected ${bodyMatches} mention(s) of "${focusKeyword}" in page body.`,
          weight: WEIGHTS.focusKeywordWeak,
        });
        deductions += WEIGHTS.focusKeywordWeak;
      }

      if (headingMatches === 0) {
        issues.push({
          type: "info",
          category: "On-Page",
          message: "Focus keyword missing from H1/H2/H3",
          details: `Add "${focusKeyword}" naturally in at least one major heading.`,
          weight: WEIGHTS.focusKeywordHeading,
        });
        deductions += WEIGHTS.focusKeywordHeading;
      }
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
    if (!html.includes("favicon") && !html.includes("icon") && !html.includes("shortcut icon")) {
      issues.push({
        type: "info",
        category: "Technical",
        message: "No favicon detected",
        details: "Improves brand recognition in browser tabs.",
        weight: WEIGHTS.faviconMissing,
      });
      deductions += WEIGHTS.faviconMissing;
    }

    // Robots.txt (fetch from same origin)
    try {
      const robotsRes = await fetch(`${parsedUrl.origin}/robots.txt`, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; AlChemistSEO/1.0)" },
      });
      if (!robotsRes.ok) {
        issues.push({
          type: "info",
          category: "Technical",
          message: "No robots.txt found",
          details: "Robots.txt helps search engines crawl your site.",
          weight: WEIGHTS.robotsTxtMissing,
        });
        deductions += WEIGHTS.robotsTxtMissing;
      }
    } catch {
      issues.push({
        type: "info",
        category: "Technical",
        message: "No robots.txt found",
        details: "Robots.txt helps search engines crawl your site.",
        weight: WEIGHTS.robotsTxtMissing,
      });
      deductions += WEIGHTS.robotsTxtMissing;
    }

    // Sitemap.xml check (fetch from same origin)
    let sitemapFound = false;
    const sitemapPaths = ["/sitemap.xml", "/sitemap_index.xml", "/sitemap-index.xml", "/sitemap/index.xml"];
    for (const path of sitemapPaths) {
      try {
        const sitemapRes = await fetch(`${parsedUrl.origin}${path}`, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; AlChemistSEO/1.0)" },
        });
        if (sitemapRes.ok) {
          const text = await sitemapRes.text();
          if (text.includes("<loc>") || text.includes("sitemap")) {
            sitemapFound = true;
            break;
          }
        }
      } catch {
        continue;
      }
    }
    if (!sitemapFound) {
      issues.push({
        type: "info",
        category: "Technical",
        message: "No sitemap.xml found",
        details: "Sitemap.xml helps search engines discover and index all pages efficiently.",
        weight: WEIGHTS.sitemapMissing,
      });
      deductions += WEIGHTS.sitemapMissing;
    }

    // Internal links count + crawl graph signal
    const hrefMatches = [...html.matchAll(/href=["']([^"']+)["']/gi)];
    const outgoingInternalLinks = new Set<string>();
    for (const hrefMatch of hrefMatches) {
      const href = (hrefMatch[1] ?? "").trim();
      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("javascript:")
      ) {
        continue;
      }
      try {
        const full = new URL(href, parsedUrl.href);
        if (full.origin !== parsedUrl.origin) continue;
        full.hash = "";
        outgoingInternalLinks.add(full.href);
      } catch {
        continue;
      }
    }
    const internalLinks = [...outgoingInternalLinks];
    if (internalLinks.length < 3 && html.length > 1000) {
      issues.push({
        type: "info",
        category: "On-Page",
        message: "Few internal links",
        details: `Found ${internalLinks.length} internal links. Consider adding more for site structure.`,
        weight: WEIGHTS.internalLinksLow,
      });
      deductions += WEIGHTS.internalLinksLow;
    }

    // Anchor text analysis (generic anchors)
    const anchorMatches = [...html.matchAll(/<a[^>]*>(.*?)<\/a>/gi)];
    const genericAnchors = anchorMatches.filter((m) => {
      const t = m[1].replace(/<[^>]+>/g, "").trim().toLowerCase();
      return ["click here", "read more", "learn more", "here"].includes(t);
    }).length;
    if (genericAnchors > 0) {
      issues.push({
        type: "info",
        category: "On-Page",
        message: "Generic anchor text found",
        details: `${genericAnchors} generic anchors detected. Use descriptive anchor text for clarity and SEO.`,
        weight: WEIGHTS.anchorTextGeneric,
      });
      deductions += WEIGHTS.anchorTextGeneric;
    }

    // Broken link detection (sample up to 12 links for performance)
    const linkCandidates = [...html.matchAll(/href=["']([^"']+)["']/gi)]
      .map((m) => m[1].trim())
      .filter((href) => href && !href.startsWith("#") && !href.startsWith("mailto:") && !href.startsWith("javascript:"))
      .slice(0, 12);
    let broken = 0;
    for (const href of linkCandidates) {
      try {
        const target = new URL(href, parsedUrl.href).href;
        const linkRes = await fetch(target, {
          method: "HEAD",
          redirect: "follow",
          headers: { "User-Agent": "Mozilla/5.0 (compatible; AlChemistSEO/1.0)" },
        });
        if (linkRes.status >= 400) broken++;
      } catch {
        broken++;
      }
    }
    if (broken > 0) {
      const weight = Math.min(WEIGHTS.brokenLinks, broken * 2);
      issues.push({
        type: "warning",
        category: "Technical",
        message: "Broken links detected",
        details: `${broken} problematic links found in sampled links.`,
        weight,
      });
      deductions += weight;
    }

    const score = Math.max(0, 100 - deductions);
    const titleSnapshot = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const metaDescSnapshot = html.match(
      /<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i
    );
    const contentFingerprint = textContent
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .slice(0, 280);
    const terms = textContent
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 3);
    const termCounts = new Map<string, number>();
    for (const term of terms) {
      termCounts.set(term, (termCounts.get(term) ?? 0) + 1);
    }
    const topTerms = [...termCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([term]) => term);

    return {
      score,
      issues,
      signals: {
        title: titleSnapshot?.[1]?.trim() || null,
        metaDescription: metaDescSnapshot?.[1]?.trim() || null,
        contentFingerprint,
        internalLinksCount: internalLinks.length,
        wordCount,
        topTerms,
        outgoingInternalLinks: internalLinks.slice(0, 200),
      },
    };
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

export type PageSpeedMetrics = {
  strategy: "mobile" | "desktop";
  performanceScore: number | null;
  lcpMs: number | null;
  cls: number | null;
  inpMs: number | null;
  fcpMs: number | null;
  speedIndexMs: number | null;
  isMobileFriendly: boolean | null;
};

function extractNumericAudit(audits: Record<string, any> | undefined, key: string): number | null {
  if (!audits?.[key]) return null;
  const raw = audits[key].numericValue;
  return typeof raw === "number" ? raw : null;
}

export async function getPageSpeedMetrics(
  targetUrl: string,
  strategy: "mobile" | "desktop"
): Promise<PageSpeedMetrics | null> {
  try {
    const endpoint = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(
      targetUrl
    )}&strategy=${strategy}&category=performance&category=seo&category=best-practices`;
    const res = await fetch(endpoint, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AlChemistSEO/1.0)" },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const lighthouse = json?.lighthouseResult;
    const audits = lighthouse?.audits ?? {};
    const perfScoreRaw = lighthouse?.categories?.performance?.score;
    const performanceScore =
      typeof perfScoreRaw === "number" ? Math.round(perfScoreRaw * 100) : null;

    const viewportScore = audits?.viewport?.score;
    const tapTargetsScore = audits?.["tap-targets"]?.score;
    const isMobileFriendly =
      strategy === "mobile"
        ? (typeof viewportScore === "number" ? viewportScore === 1 : true) &&
          (typeof tapTargetsScore === "number" ? tapTargetsScore >= 0.9 : true)
        : null;

    return {
      strategy,
      performanceScore,
      lcpMs: extractNumericAudit(audits, "largest-contentful-paint"),
      cls: extractNumericAudit(audits, "cumulative-layout-shift"),
      inpMs:
        extractNumericAudit(audits, "interaction-to-next-paint") ??
        extractNumericAudit(audits, "max-potential-fid"),
      fcpMs: extractNumericAudit(audits, "first-contentful-paint"),
      speedIndexMs: extractNumericAudit(audits, "speed-index"),
      isMobileFriendly,
    };
  } catch {
    return null;
  }
}

export async function traceRedirectChain(
  targetUrl: string,
  maxHops = 6
): Promise<{ chain: string[]; hops: number; hasLoop: boolean }> {
  const chain: string[] = [];
  const seen = new Set<string>();
  let current = targetUrl.startsWith("http") ? targetUrl : `https://${targetUrl}`;
  let hops = 0;
  let hasLoop = false;

  for (let i = 0; i < maxHops; i++) {
    chain.push(current);
    if (seen.has(current)) {
      hasLoop = true;
      break;
    }
    seen.add(current);

    try {
      const res = await fetch(current, {
        method: "GET",
        redirect: "manual",
        headers: { "User-Agent": "Mozilla/5.0 (compatible; AlChemistSEO/1.0)" },
      });
      const status = res.status;
      if (status < 300 || status >= 400) break;

      const location = res.headers.get("location");
      if (!location) break;
      const next = new URL(location, current).href;
      hops++;
      current = next;
    } catch {
      break;
    }
  }

  return { chain, hops, hasLoop };
}

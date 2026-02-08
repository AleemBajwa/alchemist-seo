/**
 * Full-site crawler - fetches sitemap and/or discovers internal links
 */

export async function getUrlsFromSitemap(baseUrl: string): Promise<string[]> {
  const urls: string[] = [];
  const parsed = new URL(baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`);
  const origin = parsed.origin;

  const sitemapPaths = [
    "/sitemap.xml",
    "/sitemap_index.xml",
    "/sitemap-index.xml",
    "/sitemap/index.xml",
  ];

  for (const path of sitemapPaths) {
    try {
      const res = await fetch(`${origin}${path}`, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; AlChemistSEO/1.0)" },
      });
      if (!res.ok) continue;

      const xml = await res.text();
      const locMatches = xml.matchAll(/<loc>([^<]+)<\/loc>/gi);
      for (const m of locMatches) {
        const loc = m[1].trim();
        if (loc.startsWith("http") && new URL(loc).origin === origin) {
          if (loc.endsWith(".xml")) {
            const subUrls = await getUrlsFromSitemap(loc);
            urls.push(...subUrls);
          } else {
            urls.push(loc);
          }
        }
      }
      if (urls.length > 0) break;
    } catch {
      continue;
    }
  }

  return [...new Set(urls)];
}

export async function discoverInternalLinks(
  baseUrl: string,
  html: string
): Promise<string[]> {
  const urls: string[] = [];
  const parsed = new URL(baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`);
  const origin = parsed.origin;

  const hrefMatches = html.matchAll(/href=["']([^"']+)["']/gi);
  for (const m of hrefMatches) {
    try {
      const href = m[1].trim();
      if (href.startsWith("#") || href.startsWith("javascript:") || href.startsWith("mailto:")) continue;
      const full = new URL(href, baseUrl);
      if (full.origin === origin && full.pathname && !full.pathname.endsWith(".pdf") && !full.pathname.endsWith(".jpg")) {
        urls.push(full.href);
      }
    } catch {
      continue;
    }
  }
  return [...new Set(urls)];
}

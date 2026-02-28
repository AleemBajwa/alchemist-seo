import { JWT } from "google-auth-library";

export type GscSummary = {
  totalClicks: number;
  totalImpressions: number;
  avgCtr: number;
  avgPosition: number;
};

type SearchAnalyticsRow = {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
};

type SearchAnalyticsResponse = {
  rows?: SearchAnalyticsRow[];
};

function readGoogleServiceAccountConfig() {
  const clientEmail = process.env.GSC_CLIENT_EMAIL?.trim();
  const privateKeyRaw = process.env.GSC_PRIVATE_KEY?.trim();
  if (!clientEmail || !privateKeyRaw) return null;
  return {
    clientEmail,
    privateKey: privateKeyRaw.replace(/\\n/g, "\n"),
  };
}

function buildJwtClient() {
  const cfg = readGoogleServiceAccountConfig();
  if (!cfg) return null;
  return new JWT({
    email: cfg.clientEmail,
    key: cfg.privateKey,
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
  });
}

export async function fetchGscDimension({
  siteUrl,
  startDate,
  endDate,
  dimension,
  rowLimit = 20,
}: {
  siteUrl: string;
  startDate: string;
  endDate: string;
  dimension: "query" | "page" | "country" | "device";
  rowLimit?: number;
}) {
  const client = buildJwtClient();
  if (!client) {
    throw new Error("Google Search Console credentials are not configured.");
  }
  const token = await client.getAccessToken();
  const accessToken = token.token;
  if (!accessToken) throw new Error("Failed to authorize with Google Search Console.");

  const res = await fetch(
    `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startDate,
        endDate,
        dimensions: [dimension],
        rowLimit,
      }),
      cache: "no-store",
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GSC ${dimension} request failed: ${text || res.statusText}`);
  }
  return (await res.json()) as SearchAnalyticsResponse;
}

export function summarizeRows(rows: SearchAnalyticsRow[]): GscSummary {
  const totals = rows.reduce(
    (acc, row) => {
      const clicks = row.clicks ?? 0;
      const impressions = row.impressions ?? 0;
      acc.totalClicks += clicks;
      acc.totalImpressions += impressions;
      acc.weightedPosition += (row.position ?? 0) * impressions;
      return acc;
    },
    { totalClicks: 0, totalImpressions: 0, weightedPosition: 0 }
  );

  const avgCtr =
    totals.totalImpressions > 0 ? (totals.totalClicks / totals.totalImpressions) * 100 : 0;
  const avgPosition =
    totals.totalImpressions > 0 ? totals.weightedPosition / totals.totalImpressions : 0;

  return {
    totalClicks: totals.totalClicks,
    totalImpressions: totals.totalImpressions,
    avgCtr,
    avgPosition,
  };
}

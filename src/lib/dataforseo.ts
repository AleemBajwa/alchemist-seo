/**
 * DataForSEO API client - shared auth and fetch helpers
 */

export function buildDataForSeoAuthHeader() {
  const apiKey = process.env.DATA_FOR_SEO_API_KEY?.trim() ?? process.env.DATAFORSEO_API_KEY?.trim();
  const login = process.env.DATA_FOR_SEO_LOGIN?.trim();
  const password = process.env.DATA_FOR_SEO_PASSWORD?.trim();

  if (apiKey) {
    if (apiKey.startsWith("Basic ")) return apiKey;
    if (apiKey.includes(":")) {
      return `Basic ${Buffer.from(apiKey).toString("base64")}`;
    }
    return `Basic ${apiKey}`;
  }
  if (login && password) {
    return `Basic ${Buffer.from(`${login}:${password}`).toString("base64")}`;
  }
  return null;
}

export async function dataForSeoPost<T = unknown>(
  path: string,
  body: unknown[]
): Promise<{ success: boolean; data?: T; error?: string }> {
  const authHeader = buildDataForSeoAuthHeader();
  if (!authHeader) {
    return {
      success: false,
      error: "API_KEYS_REQUIRED",
    };
  }

  const res = await fetch(`https://api.dataforseo.com${path}`, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  if (!res.ok || json?.status_code >= 40000) {
    return {
      success: false,
      error: json?.status_message ?? "DataForSEO request failed",
    };
  }
  return { success: true, data: json as T };
}

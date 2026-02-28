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

function normalizeDataForSeoError(json: any): string | null {
  const topStatusCode = Number(json?.status_code ?? 0);
  if (topStatusCode >= 40000) {
    return String(json?.status_message || "DataForSEO request failed");
  }

  const firstTask = Array.isArray(json?.tasks) ? json.tasks[0] : null;
  const taskStatusCode = Number(firstTask?.status_code ?? 0);
  if (taskStatusCode >= 40000) {
    const msg = String(firstTask?.status_message || json?.status_message || "DataForSEO task failed");
    return msg.toLowerCase() === "ok" || msg.toLowerCase() === "ok."
      ? "Data source returned no usable results for this request."
      : msg;
  }

  if (json?.status_message && (String(json.status_message).toLowerCase() === "ok" || String(json.status_message).toLowerCase() === "ok.")) {
    return null;
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
  const normalizedError = normalizeDataForSeoError(json);
  if (!res.ok || normalizedError) {
    return {
      success: false,
      error: normalizedError ?? String(json?.status_message || "DataForSEO request failed"),
    };
  }
  return { success: true, data: json as T };
}

export async function dataForSeoGet<T = unknown>(
  path: string
): Promise<{ success: boolean; data?: T; error?: string }> {
  const authHeader = buildDataForSeoAuthHeader();
  if (!authHeader) {
    return { success: false, error: "API_KEYS_REQUIRED" };
  }
  const res = await fetch(`https://api.dataforseo.com${path}`, {
    method: "GET",
    headers: { Authorization: authHeader },
  });
  const json = await res.json();
  const normalizedError = normalizeDataForSeoError(json);
  if (!res.ok || normalizedError) {
    return {
      success: false,
      error: normalizedError ?? String(json?.status_message || "DataForSEO request failed"),
    };
  }
  return { success: true, data: json as T };
}

import { NextResponse } from "next/server";
import { dataForSeoGet } from "@/lib/dataforseo";
import { getAllCountries } from "@/lib/countries";

/**
 * GET /api/keywords/locations
 * Returns all countries for Keyword Research country selector.
 * Tries DataForSEO Labs API first; falls back to static list if unavailable.
 */
type LocationItem = {
  location_code?: number;
  location_name?: string;
  country_iso_code?: string;
  location_type?: string;
};

export async function GET() {
  const result = await dataForSeoGet<{
    tasks?: Array<{ result?: LocationItem[] }>;
    version?: string;
  }>("/v3/dataforseo_labs/locations_and_languages");

  const rawItems =
    result.data?.tasks?.[0]?.result ??
    (Array.isArray((result.data as Record<string, unknown>)?.result)
      ? (result.data as { result: LocationItem[] }).result
      : undefined);
  const items: LocationItem[] = Array.isArray(rawItems) ? rawItems : [];

  if (result.success && items.length > 0) {
    const countries = items
      .filter((r) => {
        const type = (r.location_type ?? "").toLowerCase();
        const code = r.country_iso_code?.toLowerCase();
        return (type === "country" || !type) && code && code !== "ru" && code !== "by";
      })
      .map((r) => ({
        value: (r.country_iso_code ?? "").toLowerCase(),
        label: r.location_name ?? r.country_iso_code ?? "",
        locationCode: r.location_code ?? 2840,
      }))
      .filter((c) => c.value)
      .sort((a, b) => a.label.localeCompare(b.label));

    if (countries.length > 50) {
      return NextResponse.json({ locations: countries, source: "dataforseo" });
    }
  }

  const fallback = getAllCountries();
  return NextResponse.json({
    locations: fallback.map((c) => ({ value: c.value, label: c.label, locationCode: c.locationCode })),
    source: "static",
  });
}

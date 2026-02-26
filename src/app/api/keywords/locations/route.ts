import { NextResponse } from "next/server";
import { getAllCountries } from "@/lib/countries";

/**
 * GET /api/keywords/locations
 * Returns all countries for Keyword Research country selector.
 * Always uses the full static list (~206 countries) so the dropdown shows all options.
 */
export async function GET() {
  const locations = getAllCountries();
  return NextResponse.json({
    locations: locations.map((c) => ({ value: c.value, label: c.label, locationCode: c.locationCode })),
    source: "static",
  });
}

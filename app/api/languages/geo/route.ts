import { NextRequest, NextResponse } from "next/server";
import { getLanguagesInBounds } from "@/lib/elastic";
import { kvGet, kvSet, cacheKeys, TTL } from "@/lib/kv-cache";
import type { LanguageEntry } from "@/lib/types";
import { getErrorMessage } from "@/lib/utils/errors";
import { apiError } from "@/lib/utils/api-response";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const north = parseFloat(params.get("north") || "");
  const south = parseFloat(params.get("south") || "");
  const east = parseFloat(params.get("east") || "");
  const west = parseFloat(params.get("west") || "");

  if ([north, south, east, west].some(isNaN)) {
    return apiError("Missing or invalid bounds. Required: north, south, east, west (floats)", 400);
  }

  try {
    // Round to 1 decimal for cache key stability
    const key = cacheKeys.geo(north, south, east, west);

    // Check cache
    const cached = await kvGet<LanguageEntry[]>(key);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Query Elastic
    const languages = await getLanguagesInBounds(north, south, east, west);

    // Cache result
    await kvSet(key, languages, TTL.GEO);

    return NextResponse.json(languages);
  } catch (err) {
    console.warn("[/api/languages/geo] Failed:", getErrorMessage(err));
    return apiError("Failed to fetch languages in bounds", 500);
  }
}

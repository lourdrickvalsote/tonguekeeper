import { NextRequest, NextResponse } from "next/server";
import { getStats } from "@/lib/elastic";
import { MOCK_STATS } from "@/lib/mock-events";
import { kvGet, kvSet, cacheKeys, TTL } from "@/lib/kv-cache";
import { getErrorMessage } from "@/lib/utils/errors";

export async function GET(request: NextRequest) {
  const language_code = request.nextUrl.searchParams.get("language_code") || undefined;

  const cacheKey = cacheKeys.stats(language_code);
  const cached = await kvGet(cacheKey);
  if (cached) return NextResponse.json(cached);

  try {
    const stats = await getStats(language_code);
    kvSet(cacheKey, stats, TTL.STATS);
    return NextResponse.json(stats);
  } catch (err) {
    console.warn("[/api/stats] Elastic unavailable, using mock data:", getErrorMessage(err));
    return NextResponse.json(MOCK_STATS);
  }
}

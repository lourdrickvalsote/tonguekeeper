import { NextResponse } from "next/server";
import { getBrightDataMetrics } from "@/lib/brightdata-metrics";
import type { BrightDataMetrics } from "@/lib/types";

const EMPTY_METRICS: BrightDataMetrics = {
  searches_geo_targeted: 0,
  searches_total: 0,
  scrapes_total: 0,
  sources_discovered_via_serp_api: 0,
  sources_unlocked: 0,
  sources_unlocked_urls: [],
  sources_crawled_via_web_unlocker: 0,
  avg_crawl_duration_cheerio_ms: 0,
  avg_crawl_duration_web_unlocker_ms: 0,
  countries_searched: [],
  content_unlocked_bytes: 0,
  content_standard_bytes: 0,
};

export async function GET() {
  const metrics = getBrightDataMetrics();
  return NextResponse.json(metrics ?? EMPTY_METRICS);
}

import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import path from "path";
import { getClient } from "@/lib/elastic";
import type { LanguageEntry } from "@/lib/types";
import { getErrorMessage } from "@/lib/utils/errors";
import { apiError } from "@/lib/utils/api-response";

const GEOJSON_PATH = path.join(process.cwd(), "public", "data", "languages.geojson");
const LANGUAGES_INDEX = "languages";

// Module-level cache — loaded once per cold start
let cachedGeoJSON: string | null = null;

/**
 * Serve the pre-generated GeoJSON with strong cache headers.
 * Falls back to generating from Elastic if the static file doesn't exist.
 */
export async function GET() {
  const headers = {
    "Content-Type": "application/geo+json",
    "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
  };

  // Try static file first
  if (cachedGeoJSON) {
    return new Response(cachedGeoJSON, { status: 200, headers });
  }

  if (existsSync(GEOJSON_PATH)) {
    cachedGeoJSON = readFileSync(GEOJSON_PATH, "utf-8");
    return new Response(cachedGeoJSON, { status: 200, headers });
  }

  // Fallback: generate from Elastic on-the-fly
  try {
    const client = getClient();
    const response = await client.search<LanguageEntry>({
      index: LANGUAGES_INDEX,
      size: 10000,
      _source: [
        "glottocode",
        "name",
        "iso_code",
        "latitude",
        "longitude",
        "endangerment_status",
        "endangerment_level",
        "speaker_count",
        "macroarea",
        "language_family",
        "preservation_status.vocabulary_entries",
      ],
    });

    const features = response.hits.hits
      .map((hit) => hit._source)
      .filter(
        (src): src is LanguageEntry =>
          src !== undefined && src.latitude != null && src.longitude != null
      )
      .map((src) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [src.longitude, src.latitude],
        },
        properties: {
          g: src.glottocode,
          n: src.name,
          s: src.endangerment_status,
          l: src.endangerment_level ?? 0,
          sp: src.speaker_count ?? 0,
          m: src.macroarea,
          f: src.language_family,
          iso: src.iso_code || "",
          v: src.preservation_status?.vocabulary_entries ?? 0,
        },
      }));

    const geojson = JSON.stringify({ type: "FeatureCollection", features });
    cachedGeoJSON = geojson;

    return new Response(geojson, { status: 200, headers });
  } catch (err) {
    console.warn("[/api/languages/geojson] Failed:", getErrorMessage(err));
    return apiError("Failed to generate GeoJSON", 500);
  }
}

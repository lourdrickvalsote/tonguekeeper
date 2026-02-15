import type { LanguageEntry, EndangermentStatus, CountryLanguageStats } from "./types";

// ── Choropleth color scale ──────────────────────────────────────────────────
// Sequential purple scale matching the dark map theme.
// Thresholds: [maxCount, color]
const CHOROPLETH_STOPS: [number, string][] = [
  [0, "#1e1b4b"],
  [1, "#312e81"],
  [4, "#4338ca"],
  [9, "#6366f1"],
  [24, "#818cf8"],
  [49, "#a78bfa"],
  [99, "#c084fc"],
  [Infinity, "#e879f9"],
];

/**
 * Get choropleth fill color for a given language count.
 */
export function getChoroplethColor(count: number): string {
  for (const [max, color] of CHOROPLETH_STOPS) {
    if (count <= max) return color;
  }
  return CHOROPLETH_STOPS[CHOROPLETH_STOPS.length - 1][1];
}

/** Exported for use in the legend component. */
export const CHOROPLETH_LEGEND_ITEMS: { label: string; color: string }[] = [
  { label: "0", color: CHOROPLETH_STOPS[0][1] },
  { label: "1-4", color: CHOROPLETH_STOPS[2][1] },
  { label: "5-9", color: CHOROPLETH_STOPS[3][1] },
  { label: "10-24", color: CHOROPLETH_STOPS[4][1] },
  { label: "25-49", color: CHOROPLETH_STOPS[5][1] },
  { label: "50-99", color: CHOROPLETH_STOPS[6][1] },
  { label: "100+", color: CHOROPLETH_STOPS[7][1] },
];

/**
 * Heatmap gradient matching the dark map theme.
 * Keys are 0-1 stops, values are CSS colors.
 */
export const HEATMAP_GRADIENT: Record<number, string> = {
  0.0: "transparent",
  0.2: "#312e81",
  0.4: "#4338ca",
  0.6: "#f59e0b",
  0.8: "#ef4444",
  1.0: "#dc2626",
};

// ── Aggregation utilities ───────────────────────────────────────────────────

/**
 * Aggregate languages by country code.
 * A language with countries: ["US", "CA"] counts toward both.
 */
export function aggregateByCountry(
  languages: LanguageEntry[]
): Map<string, CountryLanguageStats> {
  const map = new Map<string, CountryLanguageStats>();

  for (const lang of languages) {
    if (!lang.countries?.length) continue;

    for (const code of lang.countries) {
      let stats = map.get(code);
      if (!stats) {
        stats = {
          country_code: code,
          country_name: code, // overridden by GeoJSON NAME property at render time
          total_languages: 0,
          by_endangerment: {},
          avg_endangerment_level: 0,
        };
        map.set(code, stats);
      }

      stats.total_languages++;
      const status = lang.endangerment_status;
      stats.by_endangerment[status] = (stats.by_endangerment[status] ?? 0) + 1;
    }
  }

  // Compute average endangerment level per country
  for (const [code, stats] of map) {
    let totalLevel = 0;
    let count = 0;
    for (const lang of languages) {
      if (lang.countries?.includes(code)) {
        totalLevel += lang.endangerment_level;
        count++;
      }
    }
    stats.avg_endangerment_level = count > 0 ? totalLevel / count : 0;
  }

  return map;
}

/**
 * Convert language entries to heatmap point data.
 * Returns [lat, lng, intensity] where intensity is normalized endangerment level.
 * Level 2 (vulnerable) → 0.3, Level 6 (extinct) → 1.0
 */
export function toHeatmapPoints(
  languages: LanguageEntry[]
): [number, number, number][] {
  const points: [number, number, number][] = [];

  for (const lang of languages) {
    if (lang.latitude == null || lang.longitude == null) continue;
    // Normalize: level 2 → 0.3, level 6 → 1.0
    const intensity = 0.3 + ((lang.endangerment_level - 2) / 4) * 0.7;
    points.push([lang.latitude, lang.longitude, intensity]);
  }

  return points;
}

"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  ZoomControl,
  useMap,
} from "react-leaflet";
import {
  LanguageEntry,
  ENDANGERMENT_COLORS,
  ENDANGERMENT_LABELS,
  MapVisualizationMode,
} from "@/lib/types";
import { toHeatmapPoints, aggregateByCountry } from "@/lib/map-utils";
import { HeatmapLayer } from "./map/HeatmapLayer";
import { ChoroplethLayer } from "./map/ChoroplethLayer";
import { MapVisualizationToggle } from "./map/MapVisualizationToggle";
import { MapLegend } from "./map/MapLegend";

// ── Constants ───────────────────────────────────────────────────────────────

const TILE_URL =
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>';

const DEFAULT_CENTER: [number, number] = [20, 0];
const DEFAULT_ZOOM = 2;
const MIN_ZOOM = 2;
const MAX_ZOOM = 12;
const MAX_BOUNDS: [[number, number], [number, number]] = [
  [-85, -180],
  [85, 180],
];

// Region centers: [lat, lng, zoom]
const REGION_CENTERS: Record<string, [number, number, number]> = {
  Africa: [0, 20, 3],
  Australia: [-25, 135, 4],
  Eurasia: [45, 60, 3],
  "North America": [45, -100, 3],
  Papunesia: [-5, 145, 4],
  "South America": [-15, -60, 3],
};

// ── Props ───────────────────────────────────────────────────────────────────

interface WorldMapProps {
  languages: LanguageEntry[];
}

// ── Main Component ──────────────────────────────────────────────────────────

export function WorldMap({ languages }: WorldMapProps) {
  const [mode, setMode] = useState<MapVisualizationMode>("markers");

  const heatmapPoints = useMemo(
    () => toHeatmapPoints(languages),
    [languages]
  );

  const countryStats = useMemo(
    () => aggregateByCountry(languages),
    [languages]
  );

  return (
    <div className="relative h-full w-full rounded-lg overflow-hidden border border-border/30">
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        maxBounds={MAX_BOUNDS}
        maxBoundsViscosity={1.0}
        preferCanvas
        style={{ height: "100%", width: "100%", background: "#1a1a2e" }}
        zoomControl={false}
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
        <ZoomControl position="topleft" />
        <MapResizer />
        <RegionFlyTo languages={languages} />

        {mode === "markers" && <MapMarkers languages={languages} />}
        {mode === "heatmap" && <HeatmapLayer points={heatmapPoints} />}
        {mode === "choropleth" && (
          <ChoroplethLayer countryStats={countryStats} />
        )}
      </MapContainer>

      {/* Overlays */}
      <MapVisualizationToggle mode={mode} onChange={setMode} />
      <MapLegend mode={mode} />
    </div>
  );
}

// ── Resizer (invalidateSize on mount) ────────────────────────────────────────

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 100);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

// ── Markers ─────────────────────────────────────────────────────────────────

// Longitude offsets so dots appear on wrapped copies of the world
const WORLD_OFFSETS = [0, -360, 360];

function MapMarkers({ languages }: { languages: LanguageEntry[] }) {
  return (
    <>
      {languages.map((lang) => {
        if (lang.latitude == null || lang.longitude == null) return null;
        const color = ENDANGERMENT_COLORS[lang.endangerment_status];

        return WORLD_OFFSETS.map((offset) => (
          <CircleMarker
            key={`${lang.glottocode}_${offset}`}
            center={[lang.latitude, lang.longitude + offset]}
            radius={4}
            pathOptions={{
              color: color,
              fillColor: color,
              fillOpacity: 0.8,
              weight: 1,
              opacity: 0.9,
            }}
          >
            <Popup>
              <PopupContent lang={lang} />
            </Popup>
          </CircleMarker>
        ));
      })}
    </>
  );
}

// ── Popup Content ───────────────────────────────────────────────────────────

function PopupContent({ lang }: { lang: LanguageEntry }) {
  const color = ENDANGERMENT_COLORS[lang.endangerment_status];
  const label = ENDANGERMENT_LABELS[lang.endangerment_status];
  const hasData = lang.preservation_status.vocabulary_entries > 0;

  return (
    <div style={{ minWidth: 180, fontFamily: "var(--font-plus-jakarta), sans-serif" }}>
      {/* Name */}
      <div
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: "#1A1714",
          marginBottom: 4,
          fontFamily: "var(--font-dm-serif), serif",
        }}
      >
        {lang.name}
      </div>

      {/* Endangerment badge */}
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          fontSize: 10,
          fontWeight: 500,
          padding: "2px 8px",
          borderRadius: 999,
          backgroundColor: `${color}18`,
          color: color,
          border: `1px solid ${color}30`,
          marginBottom: 6,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            backgroundColor: color,
            flexShrink: 0,
          }}
        />
        {label}
      </span>

      {/* Stats */}
      <div style={{ fontSize: 11, color: "#6B6560", marginTop: 6, lineHeight: 1.6 }}>
        <div>
          {lang.speaker_count != null && lang.speaker_count > 0
            ? `~${lang.speaker_count.toLocaleString()} speakers`
            : lang.speaker_count === 0
              ? "No living speakers"
              : "Speaker count unknown"}
          {" · "}
          {lang.language_family}
        </div>
        <div>
          {lang.macroarea}
          {lang.countries?.length > 0 && ` · ${lang.countries.join(", ")}`}
        </div>
      </div>

      {/* Preservation */}
      {hasData && (
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "#047857",
            marginTop: 6,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {lang.preservation_status.vocabulary_entries.toLocaleString()} entries
          preserved
        </div>
      )}

      {/* Action link */}
      <a
        href={`/languages/${lang.glottocode}`}
        style={{
          display: "inline-block",
          marginTop: 8,
          fontSize: 11,
          fontWeight: 600,
          color: "#A3470A",
          textDecoration: "none",
        }}
      >
        {hasData ? "View Archive" : "View Language"} →
      </a>
    </div>
  );
}

// ── Region Fly-To ───────────────────────────────────────────────────────────

function RegionFlyTo({ languages }: { languages: LanguageEntry[] }) {
  const map = useMap();
  const prevRegionRef = useRef<string | null>(null);

  useEffect(() => {
    if (languages.length === 0) return;

    // Detect if all languages are in a single region
    const regions = new Set(languages.map((l) => l.macroarea));
    const singleRegion = regions.size === 1 ? [...regions][0] : null;

    if (singleRegion && singleRegion !== prevRegionRef.current) {
      const center = REGION_CENTERS[singleRegion];
      if (center) {
        map.flyTo([center[0], center[1]], center[2], { duration: 1.2 });
      }
    } else if (!singleRegion && prevRegionRef.current) {
      // Reset to world view
      map.flyTo(DEFAULT_CENTER, DEFAULT_ZOOM, { duration: 1.2 });
    }

    prevRegionRef.current = singleRegion;
  }, [languages, map]);

  return null;
}

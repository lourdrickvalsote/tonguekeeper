"use client";

import type { MapVisualizationMode, EndangermentStatus } from "@/lib/types";
import { ENDANGERMENT_COLORS } from "@/lib/types";
import { CHOROPLETH_LEGEND_ITEMS } from "@/lib/map-utils";

// ── Legend items (same as original WorldMap.tsx) ─────────────────────────────

const ENDANGERMENT_LEGEND: { status: EndangermentStatus; label: string }[] = [
  { status: "vulnerable", label: "Vulnerable" },
  { status: "definitely_endangered", label: "Def. Endangered" },
  { status: "severely_endangered", label: "Severely End." },
  { status: "critically_endangered", label: "Critical" },
  { status: "extinct", label: "Extinct" },
];

// ── Props ───────────────────────────────────────────────────────────────────

interface MapLegendProps {
  mode: MapVisualizationMode;
}

// ── Component ───────────────────────────────────────────────────────────────

export function MapLegend({ mode }: MapLegendProps) {
  return (
    <div className="absolute bottom-3 right-3 z-[1000] rounded-lg border border-border/40 bg-background/90 backdrop-blur-sm px-3 py-2.5 shadow-sm">
      {mode === "markers" && <MarkersLegend />}
      {mode === "heatmap" && <HeatmapLegend />}
      {mode === "choropleth" && <ChoroplethLegend />}
    </div>
  );
}

// ── Markers Legend ──────────────────────────────────────────────────────────

function MarkersLegend() {
  return (
    <>
      <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground/60 mb-1.5">
        Endangerment
      </p>
      <div className="flex flex-col gap-1">
        {ENDANGERMENT_LEGEND.map(({ status, label }) => (
          <div key={status} className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: ENDANGERMENT_COLORS[status] }}
            />
            <span className="text-[10px] text-muted-foreground/80">
              {label}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

// ── Heatmap Legend ──────────────────────────────────────────────────────────

function HeatmapLegend() {
  return (
    <>
      <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground/60 mb-1.5">
        Language Density
      </p>
      <div
        className="h-2 w-28 rounded-full"
        style={{
          background:
            "linear-gradient(to right, #312e81, #4338ca, #f59e0b, #ef4444, #dc2626)",
        }}
      />
      <div className="flex justify-between mt-1">
        <span className="text-[9px] text-muted-foreground/60">Low</span>
        <span className="text-[9px] text-muted-foreground/60">High</span>
      </div>
      <p className="text-[8px] text-muted-foreground/40 mt-1">
        Weighted by severity
      </p>
    </>
  );
}

// ── Choropleth Legend ───────────────────────────────────────────────────────

function ChoroplethLegend() {
  return (
    <>
      <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground/60 mb-1.5">
        Languages per Country
      </p>
      <div className="flex flex-col gap-1">
        {CHOROPLETH_LEGEND_ITEMS.map(({ label, color }) => (
          <div key={label} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-sm shrink-0"
              style={{ backgroundColor: color }}
            />
            <span className="text-[10px] text-muted-foreground/80 tabular-nums">
              {label}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

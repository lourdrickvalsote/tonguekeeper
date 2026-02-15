"use client";

import { cn } from "@/lib/utils";
import type {
  MapVisualizationMode,
  EndangermentStatus,
  MapTheme,
} from "@/lib/types";
import { ENDANGERMENT_COLORS } from "@/lib/types";
import { CHOROPLETH_LEGEND_ITEMS } from "@/lib/map-utils";
import { Circle, Flame, Globe, Sun, Moon } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ── Mode config ─────────────────────────────────────────────────────────────

const MODES: {
  value: MapVisualizationMode;
  label: string;
  icon: LucideIcon;
}[] = [
  { value: "markers", label: "Markers", icon: Circle },
  { value: "heatmap", label: "Heatmap", icon: Flame },
  { value: "choropleth", label: "Countries", icon: Globe },
];

// ── Legend data ─────────────────────────────────────────────────────────────

const ENDANGERMENT_LEGEND: { status: EndangermentStatus; label: string }[] = [
  { status: "vulnerable", label: "Vulnerable" },
  { status: "definitely_endangered", label: "Def. Endangered" },
  { status: "severely_endangered", label: "Severely End." },
  { status: "critically_endangered", label: "Critical" },
  { status: "extinct", label: "Extinct" },
];

// ── Props ───────────────────────────────────────────────────────────────────

interface MapControlsProps {
  mode: MapVisualizationMode;
  onModeChange: (mode: MapVisualizationMode) => void;
  theme: MapTheme;
  onThemeChange: (theme: MapTheme) => void;
}

// ── Component ───────────────────────────────────────────────────────────────

export function MapControls({
  mode,
  onModeChange,
  theme,
  onThemeChange,
}: MapControlsProps) {
  return (
    <>
      {/* ── Bottom-left: mode switcher + legend ── */}
      <div className="absolute bottom-3 left-3 z-[1000] flex flex-col rounded-lg border border-border/40 bg-background/90 backdrop-blur-sm shadow-sm overflow-hidden">
        {/* Mode switcher */}
        <div className="flex border-b border-border/30">
          {MODES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => onModeChange(value)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium transition-colors cursor-pointer",
                mode === value
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground/70 hover:text-foreground hover:bg-muted/30"
              )}
            >
              <Icon className="h-3 w-3" />
              {label}
            </button>
          ))}
        </div>

        {/* Legend */}
        <div className="px-3 py-2">
          {mode === "markers" && <MarkersLegend />}
          {mode === "heatmap" && <HeatmapLegend />}
          {mode === "choropleth" && <ChoroplethLegend />}
        </div>
      </div>

      {/* ── Top-right: theme toggle ── */}
      <button
        onClick={() => onThemeChange(theme === "dark" ? "light" : "dark")}
        className={cn(
          "absolute top-3 right-3 z-[1000] flex h-8 w-8 items-center justify-center rounded-lg border shadow-sm backdrop-blur-sm transition-all duration-200 cursor-pointer",
          theme === "dark"
            ? "border-white/10 bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
            : "border-border/40 bg-background/90 text-muted-foreground hover:bg-background hover:text-foreground"
        )}
        title={theme === "dark" ? "Switch to light map" : "Switch to dark map"}
      >
        {theme === "dark" ? (
          <Sun className="h-3.5 w-3.5" />
        ) : (
          <Moon className="h-3.5 w-3.5" />
        )}
      </button>
    </>
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

"use client";

import { cn } from "@/lib/utils";
import type { MapVisualizationMode } from "@/lib/types";
import { Circle, Flame, Globe } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ── Props ───────────────────────────────────────────────────────────────────

interface MapVisualizationToggleProps {
  mode: MapVisualizationMode;
  onChange: (mode: MapVisualizationMode) => void;
}

// ── Mode config ─────────────────────────────────────────────────────────────

const MODES: { value: MapVisualizationMode; label: string; icon: LucideIcon }[] = [
  { value: "markers", label: "Markers", icon: Circle },
  { value: "heatmap", label: "Heatmap", icon: Flame },
  { value: "choropleth", label: "Countries", icon: Globe },
];

// ── Component ───────────────────────────────────────────────────────────────

export function MapVisualizationToggle({
  mode,
  onChange,
}: MapVisualizationToggleProps) {
  return (
    <div className="absolute top-3 right-3 z-[1000] flex rounded-lg border border-border/40 bg-background/90 backdrop-blur-sm shadow-sm overflow-hidden">
      {MODES.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          onClick={() => onChange(value)}
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
  );
}

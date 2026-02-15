"use client";

import { clusterColor, EDGE_TYPE_STYLES } from "./graph-constants";
import type { GraphEdgeType } from "@/lib/api";

interface GraphLegendProps {
  clusters: string[];
  activeCluster: string | null;
  onToggleCluster: (cluster: string | null) => void;
}

export function GraphLegend({
  clusters,
  activeCluster,
  onToggleCluster,
}: GraphLegendProps) {
  if (clusters.length === 0) return null;

  return (
    <div className="absolute bottom-3 left-3 rounded-lg border border-border/30 bg-card/80 px-3 py-2 backdrop-blur-sm">
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Clusters
      </p>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {clusters.map((c) => (
          <div
            key={c}
            className="flex cursor-pointer items-center gap-1.5 transition-opacity"
            style={{
              opacity: activeCluster === c ? 1 : activeCluster ? 0.4 : 1,
            }}
            onClick={(e) => {
              e.stopPropagation();
              onToggleCluster(activeCluster === c ? null : c);
            }}
          >
            <div
              className="h-2.5 w-2.5 rounded-full"
              style={{
                backgroundColor: clusterColor(c),
                boxShadow: `0 0 4px ${clusterColor(c)}50`,
              }}
            />
            <span className="text-[11px] text-muted-foreground">{c}</span>
          </div>
        ))}
      </div>

      <p className="mb-1 mt-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Edge types
      </p>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {(Object.entries(EDGE_TYPE_STYLES) as [GraphEdgeType, typeof EDGE_TYPE_STYLES[GraphEdgeType]][]).map(
          ([type, style]) => (
            <div key={type} className="flex items-center gap-1.5">
              <svg width="16" height="6" className="shrink-0">
                <line
                  x1="0"
                  y1="3"
                  x2="16"
                  y2="3"
                  stroke={style.color}
                  strokeWidth="2"
                  strokeDasharray={style.dash ? style.dash.join(",") : "none"}
                  strokeOpacity={style.opacity}
                />
              </svg>
              <span className="text-[11px] text-muted-foreground">
                {style.label}
              </span>
            </div>
          )
        )}
      </div>
    </div>
  );
}

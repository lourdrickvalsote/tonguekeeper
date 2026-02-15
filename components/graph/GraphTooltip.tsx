"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { clusterColor, EDGE_TYPE_STYLES } from "./graph-constants";
import type { SimNode, SimLink } from "./graph-types";
import type { GraphEdgeType } from "@/lib/api";

interface GraphTooltipProps {
  node: SimNode | null;
  position: { x: number; y: number };
  connectedLinks?: SimLink[];
}

export function GraphTooltip({ node, position, connectedLinks }: GraphTooltipProps) {
  const edgeCounts = connectedLinks
    ? connectedLinks.reduce(
        (acc, l) => {
          acc[l.type] = (acc[l.type] || 0) + 1;
          return acc;
        },
        {} as Record<GraphEdgeType, number>
      )
    : null;

  return (
    <AnimatePresence>
      {node && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.15 }}
          className="pointer-events-none absolute z-20"
          style={{
            left: position.x,
            top: position.y,
            transform: "translate(-50%, -100%) translateY(-16px)",
          }}
        >
          <div className="rounded-lg border border-border/50 bg-card/95 px-3 py-2 shadow-xl backdrop-blur-sm">
            <div className="flex items-baseline gap-2">
              <p className="text-lg font-bold leading-tight">{node.headword}</p>
              {node.romanization && (
                <p className="text-xs italic text-muted-foreground">
                  {node.romanization}
                </p>
              )}
            </div>

            {node.definition && (
              <p className="mt-1 text-xs text-muted-foreground/80 italic">
                &ldquo;{node.definition}&rdquo;
              </p>
            )}

            <div className="mt-1.5 flex items-center gap-2">
              <Badge
                variant="secondary"
                className="px-1.5 py-0 text-[10px]"
                style={{
                  backgroundColor: `${clusterColor(node.cluster)}20`,
                  color: clusterColor(node.cluster),
                }}
              >
                {node.cluster}
              </Badge>
              <span className="text-[11px] text-muted-foreground">
                {node.sourceCount} {node.sourceCount === 1 ? "source" : "sources"}
              </span>
            </div>

            {edgeCounts && Object.keys(edgeCounts).length > 0 && (
              <div className="mt-1.5 flex gap-3 border-t border-border/30 pt-1.5">
                {(Object.entries(edgeCounts) as [GraphEdgeType, number][]).map(
                  ([type, count]) => (
                    <span
                      key={type}
                      className="text-[10px] text-muted-foreground/70"
                    >
                      <span
                        className="mr-1 inline-block h-1.5 w-3 rounded-sm align-middle"
                        style={{
                          backgroundColor: EDGE_TYPE_STYLES[type].color,
                          opacity: EDGE_TYPE_STYLES[type].opacity,
                        }}
                      />
                      {count} {EDGE_TYPE_STYLES[type].label.toLowerCase()}
                    </span>
                  )
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

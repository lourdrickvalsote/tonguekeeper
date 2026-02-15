"use client";

import { motion } from "framer-motion";
import { Network, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Skeleton graph data ─────────────────────────────────────────────────────

const SKELETON_NODES = [
  { x: 100, y: 40, r: 6 },
  { x: 55, y: 70, r: 4.5 },
  { x: 145, y: 65, r: 5 },
  { x: 75, y: 115, r: 5.5 },
  { x: 130, y: 110, r: 4 },
  { x: 40, y: 130, r: 4 },
  { x: 160, y: 135, r: 4.5 },
];

const SKELETON_EDGES: [number, number][] = [
  [0, 1], [0, 2], [1, 3], [2, 4], [3, 4], [1, 5], [2, 6], [3, 5],
];

function edgeLength(a: number, b: number) {
  const dx = SKELETON_NODES[a].x - SKELETON_NODES[b].x;
  const dy = SKELETON_NODES[a].y - SKELETON_NODES[b].y;
  return Math.sqrt(dx * dx + dy * dy);
}

function AnimatedGraphSkeleton() {
  const nodeDelay = 0.15;
  const edgeBaseDelay = SKELETON_NODES.length * nodeDelay;

  return (
    <svg
      viewBox="0 0 200 170"
      className="h-36 w-48"
      fill="none"
      aria-hidden
    >
      {/* Edges — draw in after nodes */}
      {SKELETON_EDGES.map(([a, b], i) => {
        const len = edgeLength(a, b);
        return (
          <motion.line
            key={`e-${a}-${b}`}
            x1={SKELETON_NODES[a].x}
            y1={SKELETON_NODES[a].y}
            x2={SKELETON_NODES[b].x}
            y2={SKELETON_NODES[b].y}
            className="stroke-muted-foreground/20"
            strokeWidth={1.2}
            strokeDasharray={len}
            initial={{ strokeDashoffset: len, opacity: 0 }}
            animate={{ strokeDashoffset: 0, opacity: 1 }}
            transition={{
              delay: edgeBaseDelay + i * 0.1,
              duration: 0.5,
              ease: "easeOut",
            }}
          />
        );
      })}

      {/* Nodes — stagger in, then pulse */}
      {SKELETON_NODES.map((node, i) => (
        <motion.circle
          key={`n-${i}`}
          cx={node.x}
          cy={node.y}
          r={node.r}
          className="fill-primary/40"
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0, 0.7, 0.4],
            scale: [0, 1.15, 1],
          }}
          transition={{
            delay: i * nodeDelay,
            duration: 0.5,
            ease: "easeOut",
          }}
        />
      ))}

      {/* Continuous pulse on all nodes after initial reveal */}
      {SKELETON_NODES.map((node, i) => (
        <motion.circle
          key={`p-${i}`}
          cx={node.x}
          cy={node.y}
          r={node.r}
          className="fill-primary/30"
          initial={{ opacity: 0, scale: 1 }}
          animate={{
            opacity: [0, 0.5, 0],
            scale: [1, 1.6, 1],
          }}
          transition={{
            delay: edgeBaseDelay + SKELETON_EDGES.length * 0.1 + i * 0.2,
            duration: 2.5,
            repeat: Infinity,
            repeatDelay: 1.5,
            ease: "easeInOut",
          }}
        />
      ))}
    </svg>
  );
}

// ── Component ───────────────────────────────────────────────────────────────

interface GraphEmptyStateProps {
  variant: "loading" | "empty" | "error";
  message?: string;
  onRetry?: () => void;
}

export function GraphEmptyState({ variant, message, onRetry }: GraphEmptyStateProps) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-background">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center gap-4 text-center"
      >
        {variant === "loading" && (
          <>
            <AnimatedGraphSkeleton />
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Building knowledge graph
                <motion.span
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                >
                  ...
                </motion.span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground/60">
                Mapping vocabulary connections
              </p>
            </div>
          </>
        )}

        {variant === "empty" && (
          <>
            <Network className="h-12 w-12 text-muted-foreground/30" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                No vocabulary data yet
              </p>
              <p className="mt-1 max-w-[240px] text-xs text-muted-foreground/60">
                Start a preservation run to build the knowledge graph
              </p>
            </div>
          </>
        )}

        {variant === "error" && (
          <>
            <AlertCircle className="h-12 w-12 text-destructive/50" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Could not load graph data
              </p>
              {message && (
                <p className="mt-1 max-w-[280px] text-xs text-muted-foreground/60">
                  {message}
                </p>
              )}
            </div>
            {onRetry && (
              <Button variant="outline" size="sm" onClick={onRetry}>
                Retry
              </Button>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}

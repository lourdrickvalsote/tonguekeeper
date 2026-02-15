"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { fetchPipelineRuns } from "@/lib/api";
import { RunCard } from "./RunCard";
import type { PipelineRunArtifact } from "@/lib/types";

export function RunHistory({ languageCode }: { languageCode: string }) {
  const [runs, setRuns] = useState<PipelineRunArtifact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchPipelineRuns(languageCode).then((data) => {
      if (!cancelled) {
        setRuns(data);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [languageCode]);

  if (loading) {
    return (
      <div className="border-b border-border/40 px-5 py-4">
        <div className="flex items-center gap-2 mb-3">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-[60px] rounded-xl" />
          <Skeleton className="h-[60px] rounded-xl" />
        </div>
      </div>
    );
  }

  // Don't render section at all if no runs
  if (runs.length === 0) return null;

  return (
    <div className="border-b border-border/40 px-5 py-4">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-3">
        <History className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Pipeline Runs
        </span>
        <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
          {runs.length}
        </Badge>
      </div>

      {/* Run cards */}
      <div className="space-y-2">
        {runs.map((run, i) => (
          <motion.div
            key={run.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: i * 0.05 }}
          >
            <RunCard run={run} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

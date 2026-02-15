"use client";

import { LanguageBrowserStats as Stats } from "@/lib/types";
import { AlertTriangle, Skull, Shield, Globe } from "lucide-react";

interface LanguageBrowserStatsProps {
  stats: Stats;
}

const STAT_ITEMS = [
  {
    key: "total_endangered" as const,
    label: "Endangered",
    icon: Globe,
    color: "#F97316",
  },
  {
    key: "critically_endangered" as const,
    label: "Critical",
    icon: AlertTriangle,
    color: "#DC2626",
  },
  {
    key: "extinct" as const,
    label: "Extinct",
    icon: Skull,
    color: "#6B7280",
  },
  {
    key: "with_preservation_data" as const,
    label: "Preserved",
    icon: Shield,
    color: "#047857",
  },
];

export function LanguageBrowserStats({ stats }: LanguageBrowserStatsProps) {
  return (
    <div className="flex items-center gap-1 font-mono">
      {STAT_ITEMS.map((item) => (
        <div
          key={item.key}
          className="flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 transition-colors hover:bg-secondary/60"
        >
          <div
            className="flex h-5 w-5 items-center justify-center rounded"
            style={{ backgroundColor: `${item.color}0C` }}
          >
            <item.icon
              className="h-3 w-3"
              style={{ color: item.color }}
            />
          </div>
          <div className="flex flex-col">
            <p className="text-[11px] font-bold tabular-nums leading-none">
              {stats[item.key].toLocaleString()}
            </p>
            <p className="text-[8px] uppercase tracking-wider text-muted-foreground/70">
              {item.label}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

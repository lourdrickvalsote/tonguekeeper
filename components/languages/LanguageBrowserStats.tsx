"use client";

import { LanguageBrowserStats as Stats } from "@/lib/types";

interface LanguageBrowserStatsProps {
  stats: Stats;
}

const STAT_ITEMS = [
  {
    key: "total_endangered" as const,
    label: "Endangered",
    color: "#F97316",
    suffix: "+",
  },
  {
    key: "critically_endangered" as const,
    label: "Critical",
    color: "#DC2626",
    suffix: "",
  },
  {
    key: "extinct" as const,
    label: "Extinct",
    color: "#6B7280",
    suffix: "",
  },
  {
    key: "with_preservation_data" as const,
    label: "Preserved",
    color: "#047857",
    suffix: "",
  },
];

export function LanguageBrowserStats({ stats }: LanguageBrowserStatsProps) {
  return (
    <div className="border-b border-border/30 bg-muted/5 px-5 py-3">
      {/* Editorial divider label */}
      <div className="flex items-center gap-4 mb-3">
        <div className="flex-1 h-px bg-border/30" />
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/40 shrink-0 select-none">
          Endangered languages at a glance
        </p>
        <div className="flex-1 h-px bg-border/30" />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-6">
        {STAT_ITEMS.map((item) => (
          <div key={item.key} className="flex flex-col items-center gap-1.5">
            <span className="font-serif text-2xl tabular-nums text-foreground">
              {stats[item.key].toLocaleString()}
              {item.suffix}
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="h-1.5 w-1.5 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/50">
                {item.label}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

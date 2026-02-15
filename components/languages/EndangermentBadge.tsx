"use client";

import { cn } from "@/lib/utils";
import {
  EndangermentStatus,
  ENDANGERMENT_COLORS,
  ENDANGERMENT_LABELS,
} from "@/lib/types";

interface EndangermentBadgeProps {
  status: EndangermentStatus;
  className?: string;
  size?: "sm" | "default";
}

export function EndangermentBadge({
  status,
  className,
  size = "default",
}: EndangermentBadgeProps) {
  const color = ENDANGERMENT_COLORS[status];
  const label = ENDANGERMENT_LABELS[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap",
        size === "sm"
          ? "px-2 py-0.5 text-[10px]"
          : "px-2.5 py-0.5 text-xs",
        className
      )}
      style={{
        backgroundColor: `${color}18`,
        color: color,
        border: `1px solid ${color}30`,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full shrink-0"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}

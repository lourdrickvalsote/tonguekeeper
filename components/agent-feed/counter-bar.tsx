"use client";

import { useEffect, useRef, useState } from "react";
import { Unlock } from "lucide-react";
import type { AgentEventStats } from "@/lib/websocket";

const COUNTERS = [
  { key: "sources" as const, label: "Sources", color: "#1E40AF" },
  { key: "vocabulary" as const, label: "Vocab", color: "#047857" },
  { key: "audioClips" as const, label: "Audio", color: "#6D28D9" },
  { key: "brightdataUnlocks" as const, label: "Unlocked", color: "#0066FF" },
] as const;

// ---------------------------------------------------------------------------
// Animated number that counts up smoothly
// ---------------------------------------------------------------------------

export function AnimatedNumber({ value, color }: { value: number; color: string }) {
  const [display, setDisplay] = useState(0);
  const prevValue = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const from = prevValue.current;
    const to = value;
    prevValue.current = to;

    if (from === to) {
      setDisplay(to);
      return;
    }

    const duration = 500;
    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (to - from) * eased));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [value]);

  return (
    <span className="font-mono tabular-nums font-semibold" style={{ color }}>
      {display.toLocaleString()}
    </span>
  );
}

// ---------------------------------------------------------------------------
// CounterBar — compact horizontal row with colored accents
// ---------------------------------------------------------------------------

export function CounterBar({ stats }: { stats: AgentEventStats }) {
  return (
    <div className="flex shrink-0 items-center gap-3 border-b border-sidebar-border px-4 py-1.5 font-mono text-[10px] text-muted-foreground">
      {COUNTERS.map(({ key, label, color }) => (
        <span key={key} className="flex items-center gap-1.5">
          {key === "brightdataUnlocks" && stats[key] > 0 ? (
            <Unlock className="h-2.5 w-2.5" style={{ color }} />
          ) : (
            <span
              className="h-1 w-1 rounded-full shrink-0"
              style={{ backgroundColor: color }}
            />
          )}
          <span className="uppercase tracking-wider">{label}</span>
          <AnimatedNumber value={stats[key]} color={stats[key] > 0 ? color : "var(--muted-foreground)"} />
        </span>
      ))}
    </div>
  );
}

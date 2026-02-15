"use client";

import { useState } from "react";
import { Settings2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { GraphSettings } from "./graph-types";

interface GraphControlsProps {
  settings: GraphSettings;
  onChange: (settings: GraphSettings) => void;
}

export function GraphControls({ settings, onChange }: GraphControlsProps) {
  const [open, setOpen] = useState(false);

  const update = (partial: Partial<GraphSettings>) => {
    onChange({ ...settings, ...partial });
  };

  return (
    <div className="absolute right-3 top-12">
      <button
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/30 bg-card/80 text-muted-foreground backdrop-blur-sm transition-colors hover:bg-muted/50 hover:text-foreground"
        onClick={() => setOpen(!open)}
        title="Graph settings"
      >
        <Settings2 className="h-4 w-4" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-1 w-56 rounded-lg border border-border/30 bg-card/95 p-3 shadow-xl backdrop-blur-sm"
          >
            <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Graph Settings
            </p>

            {/* Link Distance */}
            <label className="mb-2 block">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">
                  Link Distance
                </span>
                <span className="text-[10px] text-muted-foreground/60">
                  {settings.linkDistance}
                </span>
              </div>
              <input
                type="range"
                min={40}
                max={200}
                value={settings.linkDistance}
                onChange={(e) =>
                  update({ linkDistance: Number(e.target.value) })
                }
                className="mt-1 h-1 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
              />
            </label>

            {/* Charge Strength */}
            <label className="mb-2 block">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">
                  Repulsion
                </span>
                <span className="text-[10px] text-muted-foreground/60">
                  {Math.abs(settings.chargeStrength)}
                </span>
              </div>
              <input
                type="range"
                min={50}
                max={400}
                value={Math.abs(settings.chargeStrength)}
                onChange={(e) =>
                  update({ chargeStrength: -Number(e.target.value) })
                }
                className="mt-1 h-1 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
              />
            </label>

            {/* Toggles */}
            <div className="mt-2.5 space-y-1.5">
              <Toggle
                label="Show labels"
                checked={settings.showLabels}
                onChange={(v) => update({ showLabels: v })}
              />
              <Toggle
                label="Curved edges"
                checked={settings.curvedEdges}
                onChange={(v) => update({ curvedEdges: v })}
              />
              <Toggle
                label="Edge type styling"
                checked={settings.showEdgeTypes}
                onChange={(v) => update({ showEdgeTypes: v })}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-4 w-7 rounded-full transition-colors ${
          checked ? "bg-primary" : "bg-muted"
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-3 w-3 rounded-full bg-white transition-transform ${
            checked ? "translate-x-3" : "translate-x-0"
          }`}
        />
      </button>
    </label>
  );
}

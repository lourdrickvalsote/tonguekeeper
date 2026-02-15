"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { BrowserSession } from "./use-browser-sessions";

interface Props {
  sessions: Map<string, BrowserSession>;
  selectedUrl: string | null;
  onSelect: (url: string) => void;
  onRemove: (url: string) => void;
}

export function BrowserSessionPanel({
  sessions,
  selectedUrl,
  onSelect,
  onRemove,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const selected = selectedUrl ? sessions.get(selectedUrl) : null;
  const sessionList = Array.from(sessions.values()).sort((a, b) =>
    b.startedAt.localeCompare(a.startedAt)
  );

  // Listen for Browserbase iframe disconnect
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data === "browserbase-disconnected" && selectedUrl) {
        onRemove(selectedUrl);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [selectedUrl, onRemove]);

  if (!selected) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="shrink-0 border-b border-purple-500/20 overflow-hidden"
    >
      {/* Header — clickable to collapse/expand */}
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full items-center gap-1.5 px-4 py-1.5 hover:bg-purple-500/5 transition-colors"
      >
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-purple-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-purple-500" />
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-purple-600">
          Live Browser
        </span>
        <Badge
          variant="secondary"
          className="px-1 py-0 font-mono text-[9px] bg-purple-500/8 text-purple-600"
        >
          {sessions.size}
        </Badge>
        <ChevronDown
          className={cn(
            "ml-auto h-3 w-3 text-purple-500/40 transition-transform duration-200",
            collapsed && "-rotate-90"
          )}
        />
      </button>

      {!collapsed && (
        <>
          {/* Tab bar — only with 2+ sessions */}
          {sessions.size > 1 && (
            <div className="flex items-center gap-px border-b border-purple-500/10 px-4">
              {sessionList.map((session) => (
                <button
                  key={session.url}
                  onClick={() => onSelect(session.url)}
                  className={`relative px-2.5 py-1.5 text-[10px] font-mono tracking-wide transition-colors hover:text-purple-600/80 hover:bg-purple-500/5 ${
                    selectedUrl === session.url
                      ? "text-purple-600 font-semibold"
                      : "text-muted-foreground/70"
                  }`}
                >
                  {session.label}
                  {selectedUrl === session.url && (
                    <motion.div
                      layoutId="browserTab"
                      className="absolute bottom-0 left-0 right-0 h-[2px] bg-purple-500"
                      transition={{ type: "spring", stiffness: 500, damping: 40 }}
                    />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Iframe */}
          <div className="px-2 pb-2 pt-1">
            <div className="relative group">
              <iframe
                key={selected.debugUrl}
                src={selected.debugUrl}
                sandbox="allow-same-origin allow-scripts"
                allow="clipboard-read; clipboard-write"
                className="h-[280px] w-full rounded border-2 border-purple-500/20 bg-background/50"
                style={{ pointerEvents: "none" }}
              />
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500/0 via-purple-500/40 to-purple-500/0" />
              <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-950/40 backdrop-blur-sm border border-purple-500/20">
                <span className="h-1 w-1 rounded-full bg-purple-400 animate-pulse-dot" />
                <span className="text-[8px] font-mono uppercase tracking-wider text-purple-300/90">
                  LIVE
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}

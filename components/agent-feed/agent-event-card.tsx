"use client";

import { motion } from "framer-motion";
import { Loader2, CheckCircle2, AlertCircle, Bot, ExternalLink, Unlock, Database } from "lucide-react";
import { AgentEvent, AGENT_COLORS, AGENT_LABELS } from "@/lib/types";

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function getActionLabel(action: string): string {
  return action.replace(/_/g, " ");
}

const STATUS_INDICATOR: Record<string, React.ElementType> = {
  running: Loader2,
  complete: CheckCircle2,
  error: AlertCircle,
};

export function AgentEventCard({ event, isActive }: { event: AgentEvent; isActive?: boolean }) {
  const agentColor = AGENT_COLORS[event.agent];
  const agentLabel = AGENT_LABELS[event.agent];
  const StatusIcon = STATUS_INDICATOR[event.status];

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <div
        className={`flex items-start gap-2 border-l-2 py-1.5 pl-3 pr-2 font-mono text-[11px] leading-relaxed transition-all duration-150 ${
          isActive
            ? "hover:bg-primary/5"
            : "hover:bg-sidebar-accent/60"
        }`}
        style={{
          borderLeftColor: agentColor,
          ...(isActive ? { backgroundColor: `${agentColor}06` } : {}),
        }}
      >
        {/* Timestamp */}
        <span className="shrink-0 text-muted-foreground/70 tabular-nums">
          {formatTimestamp(event.timestamp)}
        </span>

        {/* Status icon */}
        <span className="mt-0.5 shrink-0">
          {event.status === "running" ? (
            <StatusIcon className="h-3 w-3 animate-spin" style={{ color: agentColor }} />
          ) : event.status === "error" ? (
            <StatusIcon className="h-3 w-3 text-destructive/80" />
          ) : (
            <StatusIcon className="h-3 w-3 text-muted-foreground/40" />
          )}
        </span>

        {/* Agent + action + message */}
        <span className="min-w-0 flex-1" style={{ overflowWrap: "anywhere" }}>
          <span
            className="font-semibold uppercase text-[10px]"
            style={{ color: agentColor }}
          >
            {agentLabel}
          </span>
          <span className={isActive ? "text-foreground/60" : "text-muted-foreground"}>
            {" "}{getActionLabel(event.action)}
          </span>
          {(event.data.message || event.data.title) && (
            <span className={isActive ? "text-foreground/80" : "text-foreground/60"}>
              {" — "}{event.data.message || event.data.title}
            </span>
          )}
          {event.data.count !== undefined && (
            <span className="font-semibold" style={{ color: agentColor }}>
              {" "}+{event.data.count.toLocaleString()}
            </span>
          )}
          {event.data.crawl_method === "stagehand" && (
            <span className="ml-1 inline-flex items-center gap-0.5 rounded bg-purple-500/10 px-1 py-px text-[9px] font-semibold uppercase text-purple-600">
              <Bot className="h-2.5 w-2.5" />
              Stagehand
            </span>
          )}
          {event.data.brightdata_unlocked && (
            <span className="ml-1 inline-flex items-center gap-0.5 rounded bg-blue-500/10 px-1 py-px text-[9px] font-semibold uppercase text-blue-600">
              <Unlock className="h-2.5 w-2.5" />
              Web Unlocker
            </span>
          )}
          {event.data.crawl_method === "web_unlocker" && !event.data.brightdata_unlocked && (
            <span className="ml-1 inline-flex items-center gap-0.5 rounded bg-blue-500/10 px-1 py-px text-[9px] font-semibold uppercase text-blue-500">
              <Database className="h-2.5 w-2.5" />
              Web Unlocker
            </span>
          )}
          {event.data.crawl_strategy && (
            <span className="ml-0.5 text-[9px] text-muted-foreground/60">
              {event.data.crawl_strategy.toLowerCase()}
              {event.data.crawl_pages != null && event.data.crawl_pages > 1 && ` ×${event.data.crawl_pages}`}
            </span>
          )}
          {event.data.browserbase_url && (
            <a
              href={event.data.browserbase_url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1 inline-flex items-center gap-0.5 text-[9px] text-blue-500 hover:text-blue-600 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-2.5 w-2.5" />
              replay
            </a>
          )}
        </span>
      </div>
    </motion.div>
  );
}

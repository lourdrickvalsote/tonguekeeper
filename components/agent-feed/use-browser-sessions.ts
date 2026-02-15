"use client";

import { useState, useEffect, useCallback } from "react";
import type { AgentEvent } from "@/lib/types";

export interface BrowserSession {
  url: string;
  debugUrl: string;
  label: string;
  startedAt: string;
}

export interface UseBrowserSessionsReturn {
  sessions: Map<string, BrowserSession>;
  selectedUrl: string | null;
  selectSession: (url: string) => void;
  removeSession: (url: string) => void;
}

function extractHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.slice(0, 30);
  }
}

export function useBrowserSessions(events: AgentEvent[]): UseBrowserSessionsReturn {
  const [sessions, setSessions] = useState<Map<string, BrowserSession>>(new Map());
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);

  // Rebuild sessions from events array on each update
  useEffect(() => {
    const liveEvents = events.filter(
      (e) => e.action === "stagehand_live" && e.data.live_debug_url && e.data.url
    );
    const endedUrls = new Set<string>();
    events
      .filter((e) => e.action === "stagehand_ended" && e.data.url)
      .forEach((e) => {
        const latestLive = liveEvents.findLast((l) => l.data.url === e.data.url);
        if (latestLive && e.timestamp > latestLive.timestamp) {
          endedUrls.add(e.data.url!);
        }
      });

    const newSessions = new Map<string, BrowserSession>();
    for (const event of liveEvents) {
      const url = event.data.url!;
      if (endedUrls.has(url)) continue;
      newSessions.set(url, {
        url,
        debugUrl: event.data.live_debug_url!,
        label: extractHostname(url),
        startedAt: event.timestamp,
      });
    }

    setSessions(newSessions);

    // Auto-select: if current selection is gone, pick newest
    if (newSessions.size > 0) {
      setSelectedUrl((prev) => {
        if (prev && newSessions.has(prev)) return prev;
        let newest: string | null = null;
        let newestTime = "";
        newSessions.forEach((s) => {
          if (s.startedAt > newestTime) {
            newestTime = s.startedAt;
            newest = s.url;
          }
        });
        return newest;
      });
    } else {
      setSelectedUrl(null);
    }
  }, [events]);

  const selectSession = useCallback((url: string) => setSelectedUrl(url), []);

  const removeSession = useCallback(
    (url: string) => {
      setSessions((prev) => {
        const next = new Map(prev);
        next.delete(url);
        return next;
      });
      setSelectedUrl((prev) => {
        if (prev !== url) return prev;
        const remaining = [...sessions.keys()].filter((k) => k !== url);
        return remaining[0] ?? null;
      });
    },
    [sessions]
  );

  return { sessions, selectedUrl, selectSession, removeSession };
}

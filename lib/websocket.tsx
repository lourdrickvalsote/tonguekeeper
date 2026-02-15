"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { io, type Socket } from "socket.io-client";
import type { AgentEvent, LanguageMetadata } from "./types";
import { simulateAgentRun } from "./mock-events";
import { startPreservation } from "./api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AgentEventStats {
  sources: number;
  vocabulary: number;
  audioClips: number;
  brightdataUnlocks: number;
  brightdataCrawls: number;
  brightdataDiscoveries: number;
}

export type ConnectionStatus =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "polling"
  | "mock"
  | "disconnected";

export type PipelineStatus = "idle" | "running" | "cancelling" | "complete" | "error";

export interface UseAgentEventsReturn {
  events: AgentEvent[];
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  stats: AgentEventStats;
  pipelineStatus: PipelineStatus;
  startPipeline: (meta: LanguageMetadata) => void;
  stopPipeline: () => void;
  injectSource: (url: string, title?: string, type?: string) => void;
  restartSimulation: () => void;
  clearEvents: () => void;
  isMock: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "";
export const MAX_EVENTS = 200;
const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1000;
const POLL_INTERVAL_MS = 2000;
const MAX_POLL_FAILURES = 3;
const WS_RECOVERY_INTERVAL_MS = 30_000;

function backoffDelay(attempt: number): number {
  return Math.min(BASE_DELAY_MS * Math.pow(2, attempt - 1), 16000);
}

// ---------------------------------------------------------------------------
// useAgentEvents — core hook
// ---------------------------------------------------------------------------

export function useAgentEvents(): UseAgentEventsReturn {
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("disconnected");
  const [pipelineStatus, setPipelineStatus] =
    useState<PipelineStatus>("idle");

  const socketRef = useRef<Socket | null>(null);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const pollFailuresRef = useRef(0);
  const recoveryTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const knownIdsRef = useRef(new Set<string>());
  // Ref to break circular dependency between connect ↔ startPolling
  const connectRef = useRef<() => void>(() => {});

  // ── Dispatch: add or update an event ──────────────────────────────────

  const dispatch = useCallback((event: AgentEvent) => {
    knownIdsRef.current.add(event.id);
    setEvents((prev) => {
      const idx = prev.findIndex((e) => e.id === event.id);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = event;
        return next;
      }
      const next = [...prev, event];
      return next.length > MAX_EVENTS ? next.slice(-MAX_EVENTS) : next;
    });
  }, []);

  // ── Mock fallback ─────────────────────────────────────────────────────

  const startMock = useCallback(() => {
    cleanupRef.current?.();
    setConnectionStatus("mock");
    cleanupRef.current = simulateAgentRun(dispatch);
  }, [dispatch]);

  // ── Polling fallback ──────────────────────────────────────────────────

  const startPolling = useCallback((): void => {
    cleanupRef.current?.();
    setConnectionStatus("polling");
    pollFailuresRef.current = 0;

    async function poll() {
      try {
        const res = await fetch(`${WS_URL}/events`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        pollFailuresRef.current = 0;
        const incoming: AgentEvent[] = data.events || [];
        for (const event of incoming) {
          if (!knownIdsRef.current.has(event.id)) {
            dispatch(event);
            // Auto-detect pipeline running from incoming events
            setPipelineStatus((prev) => {
              if (prev === "idle" || prev === "complete" || prev === "error") {
                if (event.status === "running") return "running";
                if (event.agent === "orchestrator" && event.action === "pipeline_started") return "running";
              }
              return prev;
            });
          }
        }
      } catch {
        pollFailuresRef.current++;
        if (pollFailuresRef.current >= MAX_POLL_FAILURES) {
          console.warn("[Poll] Too many failures — switching to mock");
          clearInterval(intervalId);
          if (recoveryTimerRef.current) clearInterval(recoveryTimerRef.current);
          recoveryTimerRef.current = null;
          startMock();
        }
      }
    }

    poll();
    const intervalId = setInterval(poll, POLL_INTERVAL_MS);

    // Periodically probe WS recovery while polling
    recoveryTimerRef.current = setInterval(() => {
      const probe = io(WS_URL, {
        reconnection: false,
        transports: ["websocket"],
        timeout: 3000,
      });
      probe.on("connect", () => {
        console.log("[WS] Recovery probe succeeded — switching back to WebSocket");
        probe.removeAllListeners();
        probe.disconnect();
        // Stop polling
        clearInterval(intervalId);
        if (recoveryTimerRef.current) clearInterval(recoveryTimerRef.current);
        recoveryTimerRef.current = null;
        cleanupRef.current = null;
        // Reset retry counter and reconnect via ref
        retryCountRef.current = 0;
        connectRef.current();
      });
      probe.on("connect_error", () => {
        probe.removeAllListeners();
        probe.disconnect();
      });
    }, WS_RECOVERY_INTERVAL_MS);

    cleanupRef.current = () => {
      clearInterval(intervalId);
      if (recoveryTimerRef.current) {
        clearInterval(recoveryTimerRef.current);
        recoveryTimerRef.current = null;
      }
    };
  }, [dispatch, startMock]);

  // ── WebSocket connection ──────────────────────────────────────────────

  const connect = useCallback(() => {
    // Clean up any previous socket
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    setConnectionStatus("connecting");

    const socket = io(WS_URL, {
      reconnection: false,
      transports: ["websocket"],
      timeout: 4000,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      retryCountRef.current = 0;
      setConnectionStatus("connected");
    });

    socket.on("pipeline_status", (data: { running: boolean }) => {
      if (data.running) {
        setPipelineStatus((prev) =>
          prev === "idle" || prev === "complete" || prev === "error" ? "running" : prev
        );
      }
    });

    socket.on("agent_event", (event: AgentEvent) => {
      dispatch(event);
      // Auto-detect pipeline running from incoming events
      setPipelineStatus((prev) => {
        if (prev === "idle" || prev === "complete" || prev === "error") {
          if (event.status === "running") return "running";
          if (event.agent === "orchestrator" && event.action === "pipeline_started") return "running";
        }
        return prev;
      });
    });

    const scheduleRetry = () => {
      if (retryCountRef.current >= MAX_RETRIES) {
        console.warn("[WS] Max retries reached — switching to polling");
        socket.removeAllListeners();
        socket.disconnect();
        socketRef.current = null;
        startPolling();
        return;
      }
      retryCountRef.current++;
      const delay = backoffDelay(retryCountRef.current);
      console.log(
        `[WS] Retry ${retryCountRef.current}/${MAX_RETRIES} in ${delay}ms`
      );
      setConnectionStatus("reconnecting");
      retryTimerRef.current = setTimeout(connect, delay);
    };

    socket.on("disconnect", (reason) => {
      console.log("[WS] Disconnected:", reason);
      if (reason === "io client disconnect") return; // intentional
      scheduleRetry();
    });

    socket.on("connect_error", (err) => {
      console.warn("[WS] Connection error:", err.message);
      scheduleRetry();
    });
  }, [dispatch, startPolling]);

  // Keep connectRef in sync so startPolling's recovery probe can call it
  connectRef.current = connect;

  // ── Main effect: kick off connection on mount ─────────────────────────

  useEffect(() => {
    if (!WS_URL) {
      // Mock mode — don't auto-start simulation.
      // Feed starts empty; simulation begins when user clicks "Begin Preservation".
      setConnectionStatus("mock");
    } else {
      connect();
    }

    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      if (recoveryTimerRef.current) {
        clearInterval(recoveryTimerRef.current);
        recoveryTimerRef.current = null;
      }
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      cleanupRef.current?.();
    };
  }, [connect]);

  // ── Stats derived from events ─────────────────────────────────────────

  const stats = useMemo<AgentEventStats>(() => {
    let sources = 0;
    let vocabulary = 0;
    let audioClips = 0;
    let brightdataUnlocks = 0;
    let brightdataCrawls = 0;
    let brightdataDiscoveries = 0;

    for (const e of events) {
      if (e.status !== "complete") continue;
      if (e.agent === "discovery" && e.action === "found_source") {
        sources++;
        if (e.data.discovered_via === "serp_api") brightdataDiscoveries++;
      }
      if (e.agent === "extraction" && e.data.count) {
        if (e.action === "extracting_audio") {
          audioClips += e.data.count;
        } else {
          vocabulary += e.data.count;
        }
      }
      // BrightData attribution
      if (e.data.brightdata_unlocked) brightdataUnlocks++;
      if (e.data.crawl_method === "web_unlocker") brightdataCrawls++;
    }

    return { sources, vocabulary, audioClips, brightdataUnlocks, brightdataCrawls, brightdataDiscoveries };
  }, [events]);

  // ── Pipeline completion detection ─────────────────────────────────────

  useEffect(() => {
    if (pipelineStatus !== "running" && pipelineStatus !== "cancelling") return;

    const isCancelled = events.some(
      (e) =>
        e.agent === "orchestrator" &&
        e.action === "pipeline_cancelled" &&
        e.status === "complete"
    );
    const isComplete = !isCancelled && events.some(
      (e) =>
        e.agent === "orchestrator" &&
        e.status === "complete" &&
        (e.action === "pipeline_complete" ||
          (e.action === "progress_update" &&
            e.data.message?.includes("Run complete")))
    );
    const isError = !isComplete && !isCancelled && events.some(
      (e) =>
        e.agent === "orchestrator" &&
        (e.action === "pipeline_error" || e.status === "error")
    );

    if (isCancelled || isComplete || isError) {
      setPipelineStatus(isCancelled ? "idle" : isComplete ? "complete" : "error");
      // Resolve any events still stuck as "running"
      setEvents((prev) => {
        const hasRunning = prev.some((e) => e.status === "running");
        if (!hasRunning) return prev;
        return prev.map((e) =>
          e.status === "running" ? { ...e, status: "complete" as const } : e
        );
      });
    }
  }, [events, pipelineStatus]);

  // ── Resolve stale "running" events when pipeline is not active ───────
  useEffect(() => {
    if (pipelineStatus === "running" || pipelineStatus === "cancelling") return;
    const hasRunning = events.some((e) => e.status === "running");
    if (!hasRunning) return;
    setEvents((prev) =>
      prev.map((e) =>
        e.status === "running" ? { ...e, status: "complete" as const } : e
      )
    );
  }, [pipelineStatus, events]);

  // ── Actions ───────────────────────────────────────────────────────────

  const clearEvents = useCallback(() => {
    setEvents([]);
    knownIdsRef.current.clear();
  }, []);

  const startPipeline = useCallback(
    (meta: LanguageMetadata) => {
      if (pipelineStatus === "running") return;

      setPipelineStatus("running");
      clearEvents();

      // Inject synthetic header event immediately
      const displayName = meta.native_name
        ? `${meta.language_name} (${meta.native_name})`
        : meta.language_name;
      dispatch({
        id: `evt-pipeline-header-${Date.now()}`,
        agent: "orchestrator",
        action: "pipeline_started",
        status: "complete",
        data: {
          message: `Starting preservation pipeline for ${displayName}...`,
        },
        timestamp: new Date().toISOString(),
      });

      // Trigger the actual pipeline
      if (connectionStatus === "mock") {
        cleanupRef.current?.();
        knownIdsRef.current.clear();
        cleanupRef.current = simulateAgentRun(dispatch);
      } else if (socketRef.current?.connected) {
        socketRef.current.emit("start_preservation", meta);
      } else {
        startPreservation(meta);
      }
    },
    [pipelineStatus, clearEvents, dispatch, connectionStatus]
  );

  const stopPipeline = useCallback(() => {
    if (pipelineStatus !== "running") return;
    setPipelineStatus("cancelling");
    if (connectionStatus === "mock") {
      // In mock mode, just reset to idle
      cleanupRef.current?.();
      setPipelineStatus("idle");
      return;
    }
    if (socketRef.current?.connected) {
      socketRef.current.emit("stop_pipeline");
    }
  }, [pipelineStatus, connectionStatus]);

  const injectSource = useCallback(
    (url: string, title?: string, type?: string) => {
      if (pipelineStatus !== "running") return;
      if (socketRef.current?.connected) {
        socketRef.current.emit("inject_source", { url, title, type });
      }
    },
    [pipelineStatus]
  );

  const restartSimulation = useCallback(() => {
    if (connectionStatus === "mock") {
      cleanupRef.current?.();
      knownIdsRef.current.clear();
      cleanupRef.current = simulateAgentRun(dispatch);
    }
  }, [connectionStatus, dispatch]);

  return {
    events,
    isConnected: connectionStatus === "connected",
    connectionStatus,
    stats,
    pipelineStatus,
    startPipeline,
    stopPipeline,
    injectSource,
    restartSimulation,
    clearEvents,
    isMock: connectionStatus === "mock",
  };
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AgentEventsCtx = createContext<UseAgentEventsReturn | null>(null);

export function AgentEventsProvider({ children }: { children: ReactNode }) {
  const value = useAgentEvents();
  return (
    <AgentEventsCtx.Provider value={value}>{children}</AgentEventsCtx.Provider>
  );
}

export function useAgentEventsContext(): UseAgentEventsReturn {
  const ctx = useContext(AgentEventsCtx);
  if (!ctx) {
    throw new Error(
      "useAgentEventsContext must be used within <AgentEventsProvider>"
    );
  }
  return ctx;
}

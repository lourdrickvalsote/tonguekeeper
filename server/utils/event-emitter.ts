import { Server } from "socket.io";
import { randomUUID } from "crypto";
import type {
  AgentEvent,
  AgentType,
  AgentStatus,
  ServerToClientEvents,
  ClientToServerEvents,
} from "../types.js";

type IO = Server<ClientToServerEvents, ServerToClientEvents>;

let io: IO | null = null;

const eventHistory: AgentEvent[] = [];
const MAX_HISTORY = 200;

export function initEventEmitter(server: IO): void {
  io = server;
}

export function emitEvent(
  agent: AgentType,
  action: string,
  status: AgentStatus,
  data: AgentEvent["data"],
  id?: string
): AgentEvent {
  const event: AgentEvent = {
    id: id ?? randomUUID(),
    agent,
    action,
    status,
    data,
    timestamp: new Date().toISOString(),
  };

  // Update in-place if reusing an existing event ID (state transition),
  // otherwise append to history. This keeps history clean for late-joining clients.
  const existingIdx = id ? eventHistory.findIndex((e) => e.id === id) : -1;
  if (existingIdx !== -1) {
    eventHistory[existingIdx] = event;
  } else {
    eventHistory.push(event);
    if (eventHistory.length > MAX_HISTORY) {
      eventHistory.shift();
    }
  }

  if (io) {
    io.emit("agent_event", event);
  }

  const label = `[${agent.toUpperCase()}]`;
  const statusIcon = status === "error" ? "X" : status === "complete" ? "+" : "~";
  console.log(`${statusIcon} ${label} ${action}: ${data.message || data.title || data.url || ""}`);

  return event;
}

export function pushToHistory(event: AgentEvent): void {
  eventHistory.push(event);
  if (eventHistory.length > MAX_HISTORY) {
    eventHistory.shift();
  }
}

export function getEventHistory(): AgentEvent[] {
  return [...eventHistory];
}

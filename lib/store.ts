// Shared server-status store.
//
// This is in-memory and works well as long as this app runs as a single,
// persistent Node process (e.g. `next start` on Railway, Render, Fly.io,
// or your own small VPS). It will NOT reliably persist on Vercel or other
// serverless platforms, since each request can be served by a different,
// short-lived function instance with its own memory.
//
// If you deploy to Vercel: swap this file for a Vercel KV or Upstash Redis
// backed version. Keep the same exported function names/signatures so
// nothing else in the app needs to change.

export type ServerState = "offline" | "starting" | "online" | "stopping" | "error";
export type PendingCommand = "start" | "stop" | null;

interface StoreShape {
  state: ServerState;
  detail: string;
  updatedAt: number;
  pendingCommand: PendingCommand;
  pendingCommandQueuedAt: number | null;
  playersOnline: number | null;
  playersMax: number | null;
  version: string | null;
  uptimeSeconds: number | null;
}

interface ServerStats {
  playersOnline?: number | null;
  playersMax?: number | null;
  version?: string | null;
  uptimeSeconds?: number | null;
}

const globalStore = globalThis as unknown as { __mcStore?: StoreShape };

if (!globalStore.__mcStore) {
  globalStore.__mcStore = {
    state: "offline",
    detail: "",
    updatedAt: Date.now(),
    pendingCommand: null,
    pendingCommandQueuedAt: null,
    playersOnline: null,
    playersMax: null,
    version: null,
    uptimeSeconds: null,
  };
}

const store = globalStore.__mcStore;

// The agent polls for commands and reports status roughly every 5s while
// it's alive. If we haven't heard from it in noticeably longer than that,
// something's wrong (script not running, PC/network unreachable) -- don't
// keep trusting a stale "online"/"starting"/"stopping" state forever.
const COMMAND_PICKUP_GRACE_MS = 6_000;
const REPORT_STALE_MS = 12_000;
const UNREACHABLE_HOLD_MS = 8_000;

function unreachableOrOffline(elapsedPastThreshold: number) {
  return {
    state: "offline" as ServerState,
    detail: elapsedPastThreshold < UNREACHABLE_HOLD_MS ? "PC unreachable" : "",
    updatedAt: store.updatedAt,
    playersOnline: null,
    playersMax: null,
    version: null,
    uptimeSeconds: null,
  };
}

export function getStatus() {
  const now = Date.now();

  if (store.pendingCommand && store.pendingCommandQueuedAt) {
    const sinceQueued = now - store.pendingCommandQueuedAt;
    if (sinceQueued > COMMAND_PICKUP_GRACE_MS) {
      return unreachableOrOffline(sinceQueued - COMMAND_PICKUP_GRACE_MS);
    }
  } else if (store.state === "online" || store.state === "starting" || store.state === "stopping") {
    const sinceReport = now - store.updatedAt;
    if (sinceReport > REPORT_STALE_MS) {
      return unreachableOrOffline(sinceReport - REPORT_STALE_MS);
    }
  }

  return {
    state: store.state,
    detail: store.detail,
    updatedAt: store.updatedAt,
    playersOnline: store.playersOnline,
    playersMax: store.playersMax,
    version: store.version,
    uptimeSeconds: store.uptimeSeconds,
  };
}

export function setStatus(state: ServerState, detail = "", stats: ServerStats = {}) {
  store.state = state;
  store.detail = detail;
  store.updatedAt = Date.now();
  store.playersOnline = stats.playersOnline ?? null;
  store.playersMax = stats.playersMax ?? null;
  store.version = stats.version ?? null;
  store.uptimeSeconds = stats.uptimeSeconds ?? null;
}

export function queueStartCommand() {
  store.pendingCommand = "start";
  store.pendingCommandQueuedAt = Date.now();
}

export function queueStopCommand() {
  store.pendingCommand = "stop";
  store.pendingCommandQueuedAt = Date.now();
}

export function consumePendingCommand() {
  const command = store.pendingCommand;
  store.pendingCommand = null;
  store.pendingCommandQueuedAt = null;
  return command;
}

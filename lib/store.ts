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

export type ServerState = "offline" | "starting" | "online" | "error";

interface StoreShape {
  state: ServerState;
  detail: string;
  updatedAt: number;
  pendingCommand: "start" | null;
}

const globalStore = globalThis as unknown as { __mcStore?: StoreShape };

if (!globalStore.__mcStore) {
  globalStore.__mcStore = {
    state: "offline",
    detail: "",
    updatedAt: Date.now(),
    pendingCommand: null,
  };
}

const store = globalStore.__mcStore;

export function getStatus() {
  return {
    state: store.state,
    detail: store.detail,
    updatedAt: store.updatedAt,
  };
}

export function setStatus(state: ServerState, detail = "") {
  store.state = state;
  store.detail = detail;
  store.updatedAt = Date.now();
}

export function queueStartCommand() {
  store.pendingCommand = "start";
}

export function consumePendingCommand() {
  const command = store.pendingCommand;
  store.pendingCommand = null;
  return command;
}

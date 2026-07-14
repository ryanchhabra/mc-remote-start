"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type ServerState = "offline" | "starting" | "online" | "error";

interface StatusResponse {
  state: ServerState;
  detail: string;
  updatedAt: number;
  playersOnline: number | null;
  playersMax: number | null;
  version: string | null;
  uptimeSeconds: number | null;
}

const STATE_LABELS: Record<ServerState, string> = {
  offline:  "Stopped",
  starting: "Starting Up",
  online:   "Running",
  error:    "Failed",
};

const STATE_DETAILS: Record<ServerState, string> = {
  offline:  "The server is currently offline.",
  starting: "The server is booting up. This takes a minute.",
  online:   "The server is online and ready to join.",
  error:    "The server failed to start.",
};

const BADGE_LABELS: Record<ServerState, string> = {
  offline:  "Offline",
  starting: "Starting",
  online:   "Online",
  error:    "Error",
};

function formatUptime(seconds: number): string {
  if (seconds < 60) return "<1m";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h === 0 ? `${m}m` : `${h}h ${m}m`;
}

// ── Icons ────────────────────────────────────────────────────────────────────

function IconPlay() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <polygon points="5 3 19 12 5 21 5 3"/>
    </svg>
  );
}

function IconPeople() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}

function IconClock() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  );
}

function IconCube() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
      <line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  );
}

function IconWifi() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.55a11 11 0 0 1 14.08 0"/>
      <path d="M1.42 9a16 16 0 0 1 21.16 0"/>
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
      <line x1="12" y1="20" x2="12.01" y2="20"/>
    </svg>
  );
}

function IconCopy() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2"/>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

export default function Dashboard({
  userName,
  userImage,
  serverAddress,
  signOutAction,
}: {
  userName: string;
  userImage?: string;
  serverAddress: string | null;
  signOutAction: () => Promise<void>;
}) {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [copied, setCopied] = useState(false);
  // Holds off clearing `requesting` until this timestamp, so the button
  // doesn't flicker back to "Start Server" while waiting for the Pi agent's
  // next poll (up to 5s) to actually pick up the queued start command.
  const requestUntilRef = useRef(0);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/status", { cache: "no-store" });
      if (res.ok) {
        const data: StatusResponse = await res.json();
        setStatus(data);
        const settled = data.state === "starting" || data.state === "online" || data.state === "error";
        if (settled || Date.now() >= requestUntilRef.current) {
          setRequesting(false);
        }
      }
    } catch {
      // Transient network hiccup — next poll retries.
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, 4000);
    return () => clearInterval(id);
  }, [fetchStatus]);

  async function handleStart() {
    setRequesting(true);
    requestUntilRef.current = Date.now() + 5000;
    await fetch("/api/start-server", { method: "POST" });
    fetchStatus();
    setTimeout(fetchStatus, 5000);
  }

  async function handleCopyAddress() {
    if (!serverAddress) return;
    try {
      await navigator.clipboard.writeText(serverAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard permissions denied — nothing else we can do here.
    }
  }

  const state = status?.state ?? "offline";

  const secondsAgo = status
    ? Math.max(0, Math.round((Date.now() - status.updatedAt) / 1000))
    : null;

  const buttonLabel =
    requesting || state === "starting"
      ? "Starting…"
      : state === "online"
        ? "Server Online"
        : "Start Server";

  const playersValue =
    status?.playersOnline != null && status?.playersMax != null
      ? `${status.playersOnline} / ${status.playersMax}`
      : "—";

  const uptimeValue =
    status?.uptimeSeconds != null ? formatUptime(status.uptimeSeconds) : "—";

  const [addressHost, addressPort] = serverAddress
    ? (() => {
        const i = serverAddress.lastIndexOf(":");
        return i === -1 ? [serverAddress, null] : [serverAddress.slice(0, i), serverAddress.slice(i + 1)];
      })()
    : ["—", null];

  const AvatarEl = userImage ? (
    <img className="user-avatar" src={userImage} alt={userName} referrerPolicy="no-referrer" />
  ) : (
    <div className="user-avatar user-avatar--fallback" aria-hidden="true">
      {userName[0]?.toUpperCase()}
    </div>
  );

  return (
    <div className="scene" data-state={state}>
      <div className="glow-layer glow-layer--online"   aria-hidden="true" />
      <div className="glow-layer glow-layer--starting" aria-hidden="true" />
      <div className="glow-layer glow-layer--error"    aria-hidden="true" />

      <main className="dashboard-main">
        {/* Welcome */}
        <div className="welcome-section">
          <div className="welcome-text">
            <h1 className="welcome-heading">Hi, {userName}!</h1>
          </div>
          <div className="welcome-avatar">
            {AvatarEl}
            <span className="avatar-status-dot" aria-hidden="true" />
          </div>
        </div>

        {/* Status card */}
        <section className="status-card" aria-label="Server status">
          <div className="status-card-top">
            <span className="status-section-label">Server Status</span>
            <span className="status-badge" aria-live="polite">{BADGE_LABELS[state]}</span>
          </div>

          <div className="status-card-body">
            <h2 className="status-heading" aria-live="polite">{STATE_LABELS[state]}</h2>
            <p className="status-detail">
              {status?.detail || STATE_DETAILS[state]}
            </p>
          </div>

          <button
            className="start-btn"
            onClick={handleStart}
            disabled={requesting || state === "starting" || state === "online"}
          >
            <span className="start-btn-top">
              {state !== "online" && <IconPlay />}
              {buttonLabel}
            </span>
          </button>
        </section>

        {/* Stats */}
        <div className="stats-grid" aria-label="Server statistics">
          <div className="stat-card">
            <span className="stat-card-label">Players</span>
            <span className="stat-card-icon"><IconPeople /></span>
            <span className="stat-card-value">{playersValue}</span>
            <span className="stat-card-sub">{state === "online" ? "Online" : "Offline"}</span>
          </div>
          <div className="stat-card">
            <span className="stat-card-label">Uptime</span>
            <span className="stat-card-icon"><IconClock /></span>
            <span className="stat-card-value">{uptimeValue}</span>
            <span className="stat-card-sub">{state === "online" ? "Running" : "Offline"}</span>
          </div>
          <div className="stat-card">
            <span className="stat-card-label">Version</span>
            <span className="stat-card-icon"><IconCube /></span>
            <span className="stat-card-value">{status?.version ?? "—"}</span>
            <span className="stat-card-sub">{status?.version ? "Java Edition" : "—"}</span>
          </div>
        </div>

        {/* Address */}
        <section className="address-card" aria-label="Server address">
          <div className="address-card-top">
            <span className="address-card-icon"><IconWifi /></span>
            <span className="stat-card-label">Address</span>
            <span className="address-card-sub">{state === "online" ? "Active" : "Not running"}</span>
          </div>

          <div className="address-value-row">
            <span className="address-value">{addressHost}</span>
            {addressPort && <span className="address-port">:{addressPort}</span>}
          </div>

          <button
            className="copy-address-btn"
            onClick={handleCopyAddress}
            disabled={!serverAddress}
          >
            {copied ? <IconCheck /> : <IconCopy />}
            {copied ? "Copied" : "Copy Address"}
          </button>
        </section>

        {/* Footer */}
        <footer className="dashboard-footer">
          <span className="footer-meta" aria-live="polite">
            {secondsAgo !== null ? `Updated ${secondsAgo}s ago` : ""}
          </span>
          <form action={signOutAction}>
            <button type="submit" className="sign-out-btn">Sign out</button>
          </form>
        </footer>
      </main>
    </div>
  );
}

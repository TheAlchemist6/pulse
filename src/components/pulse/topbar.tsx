"use client";

import { useState } from "react";

interface TopbarProps {
  totalChannels: number;
  activeGroup: string | null;
  lastSyncedAt: Date | string | null;
  onSync: () => void | Promise<void>;
}

function formatRelative(d: Date | string | null): string {
  if (!d) return "never synced";
  const date = typeof d === "string" ? new Date(d) : d;
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "synced just now";
  if (seconds < 3600) return `synced ${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `synced ${Math.floor(seconds / 3600)}h ago`;
  return `synced ${Math.floor(seconds / 86400)}d ago`;
}

export function Topbar({ totalChannels, activeGroup, lastSyncedAt, onSync }: TopbarProps) {
  const [syncing, setSyncing] = useState(false);

  async function handleSync() {
    if (syncing) return;
    setSyncing(true);
    try {
      await onSync();
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div
      className="flex h-[52px] shrink-0 items-center justify-between px-8"
      style={{ borderBottom: "1px solid var(--pulse-border)" }}
    >
      <div className="flex items-baseline gap-3">
        <span
          className="text-[18px]"
          style={{ fontFamily: "var(--font-cormorant)", color: "var(--pulse-text)" }}
        >
          {totalChannels}
        </span>
        <span
          className="text-[11px]"
          style={{ fontFamily: "var(--font-dm-mono)", color: "var(--pulse-muted)" }}
        >
          subscriptions · Pulse Map
        </span>
        {activeGroup && (
          <>
            <span style={{ color: "var(--pulse-subtle)", fontSize: "12px" }}>·</span>
            <span
              className="text-[11px]"
              style={{
                fontFamily: "var(--font-dm-mono)",
                color: "var(--pulse-amber)",
                letterSpacing: "0.05em",
              }}
            >
              {activeGroup}
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-4">
        <span
          className="text-[10px]"
          style={{ fontFamily: "var(--font-dm-mono)", color: "var(--pulse-muted)" }}
        >
          {formatRelative(lastSyncedAt)}
        </span>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="border px-3 py-1 text-[10px] uppercase tracking-[0.1em] transition-colors hover:text-[var(--pulse-amber)] disabled:opacity-50"
          style={{
            fontFamily: "var(--font-dm-mono)",
            color: "var(--pulse-muted)",
            borderColor: "var(--pulse-border)",
            background: "transparent",
          }}
          onMouseEnter={(e) => {
            if (!syncing) e.currentTarget.style.borderColor = "rgba(245,158,11,0.3)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--pulse-border)";
          }}
        >
          ↻ {syncing ? "Syncing..." : "Sync"}
        </button>
      </div>
    </div>
  );
}

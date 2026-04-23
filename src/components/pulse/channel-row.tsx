"use client";

import { useState, useRef } from "react";
import { MoveDropdown } from "./move-dropdown";
import type { Group, Niche } from "@/lib/classification/taxonomy";

export interface PulseChannel {
  channelId: string;
  title: string;
  thumbnailUrl?: string | null;
  primaryGroup: string | null;
  primaryNiche: string | null;
}

interface ChannelRowProps {
  channel: PulseChannel;
  onMoved: (channelId: string, group: Group, niche: Niche) => void;
}

function getInitials(title: string): string {
  const cleaned = title.trim();
  if (!cleaned) return "??";
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    return cleaned.slice(0, 2).toUpperCase();
  }
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function ChannelRow({ channel, onMoved }: ChannelRowProps) {
  const [moveOpen, setMoveOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [hovered, setHovered] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  async function handleMove(newGroup: Group, newNiche: Niche) {
    setPending(true);
    try {
      const res = await fetch(`/api/subscriptions/${channel.channelId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ primaryGroup: newGroup, primaryNiche: newNiche }),
      });
      if (!res.ok) {
        console.error("Move failed:", await res.text());
        setPending(false);
        return;
      }
      onMoved(channel.channelId, newGroup, newNiche);
      setPending(false);
    } catch (err) {
      console.error("Move error:", err);
      setPending(false);
    }
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group relative flex items-center gap-3 py-2 pl-[34px] pr-5 transition-colors hover:bg-[rgba(255,255,255,0.02)]"
      style={{ opacity: pending ? 0.5 : 1 }}
    >
      <div
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border"
        style={{
          background: "var(--pulse-border)",
          borderColor: "var(--pulse-border-hi)",
        }}
      >
        {channel.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={channel.thumbnailUrl}
            alt=""
            className="h-full w-full rounded-full object-cover"
          />
        ) : (
          <span
            className="text-[8px] leading-none"
            style={{ fontFamily: "var(--font-cormorant)", color: "var(--pulse-amber)" }}
          >
            {getInitials(channel.title)}
          </span>
        )}
      </div>

      <span
        className="flex-1 truncate text-[11px] tracking-[0.02em]"
        style={{ fontFamily: "var(--font-dm-mono)", color: "var(--pulse-text-warm)" }}
        title={channel.title}
      >
        {channel.title}
      </span>

      {(hovered || moveOpen) && (
        <div className="relative">
          <button
            ref={triggerRef}
            onClick={() => setMoveOpen((v) => !v)}
            className="border px-2 py-0.5 text-[9px] uppercase tracking-[0.1em] transition-colors hover:text-[var(--pulse-amber)]"
            style={{
              fontFamily: "var(--font-dm-mono)",
              color: "var(--pulse-muted)",
              borderColor: moveOpen ? "rgba(245,158,11,0.3)" : "var(--pulse-border)",
              background: "transparent",
            }}
          >
            Move ↕
          </button>
          {moveOpen && (
            <div className="absolute right-0 top-full z-50 mt-1">
              <MoveDropdown
                currentGroup={channel.primaryGroup}
                currentNiche={channel.primaryNiche}
                onMove={handleMove}
                onClose={() => setMoveOpen(false)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { ChannelRow, type PulseChannel } from "./channel-row";
import type { Group, Niche } from "@/lib/classification/taxonomy";

interface NicheSectionProps {
  niche: string;
  channels: PulseChannel[];
  onChannelMoved: (channelId: string, group: Group, niche: Niche) => void;
}

export function NicheSection({ niche, channels, onChannelMoved }: NicheSectionProps) {
  const [open, setOpen] = useState(true);

  return (
    <div style={{ borderBottom: "1px solid var(--pulse-border)" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-[10px] px-5 py-3 text-left transition-colors hover:bg-[rgba(255,255,255,0.02)]"
      >
        <span
          className="inline-block h-[5px] w-[5px] shrink-0 rounded-full"
          style={{ background: "var(--pulse-amber)", opacity: 0.5 }}
        />
        <span
          className="flex-1 text-[10px] tracking-[0.1em]"
          style={{ fontFamily: "var(--font-dm-mono)", color: "var(--pulse-muted)" }}
        >
          {niche}
        </span>
        <span
          className="text-[10px]"
          style={{ fontFamily: "var(--font-dm-mono)", color: "var(--pulse-subtle)" }}
        >
          {channels.length}
        </span>
        <span
          className="inline-block transition-transform"
          style={{
            transform: open ? "rotate(90deg)" : "rotate(0deg)",
            color: "var(--pulse-subtle)",
            fontSize: "9px",
          }}
        >
          ▶
        </span>
      </button>

      {open && (
        <div className="pb-2 pt-1">
          {channels.length === 0 ? (
            <div
              className="px-5 py-2 text-[10px]"
              style={{ fontFamily: "var(--font-dm-mono)", color: "var(--pulse-subtle)" }}
            >
              empty
            </div>
          ) : (
            channels.map((c) => (
              <ChannelRow key={c.channelId} channel={c} onMoved={onChannelMoved} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

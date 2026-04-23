"use client";

import { NicheSection } from "./niche-section";
import type { PulseChannel } from "./channel-row";
import type { Group, Niche } from "@/lib/classification/taxonomy";

interface ExpandedPanelProps {
  group: string;
  niches: { name: string; channels: PulseChannel[] }[];
  totalChannels: number;
  onClose: () => void;
  onChannelMoved: (channelId: string, group: Group, niche: Niche) => void;
}

export function ExpandedPanel({
  group,
  niches,
  totalChannels,
  onClose,
  onChannelMoved,
}: ExpandedPanelProps) {
  const left: typeof niches = [];
  const right: typeof niches = [];
  niches.forEach((n, i) => (i % 2 === 0 ? left : right).push(n));

  return (
    <div
      className="col-span-5 animate-[fadeUp_200ms_ease]"
      style={{
        background: "var(--pulse-surface)",
        border: "1px solid var(--pulse-border-hi)",
        borderTop: "2px solid var(--pulse-amber)",
      }}
    >
      <style jsx>{`
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
      <div
        className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: "1px solid var(--pulse-border)" }}
      >
        <div className="flex items-center gap-4">
          <div
            className="h-5 w-[2px]"
            style={{ background: "var(--pulse-amber)" }}
          />
          <h2
            className="text-[16px]"
            style={{ fontFamily: "var(--font-cormorant)", color: "var(--pulse-text)" }}
          >
            {group}
          </h2>
          <span
            className="text-[10px]"
            style={{ fontFamily: "var(--font-dm-mono)", color: "var(--pulse-muted)" }}
          >
            {totalChannels} channels · {niches.length} {niches.length === 1 ? "niche" : "niches"}
          </span>
        </div>
        <button
          onClick={onClose}
          className="border px-3 py-1 text-[10px] uppercase tracking-[0.1em] transition-colors hover:text-[var(--pulse-amber)]"
          style={{
            fontFamily: "var(--font-dm-mono)",
            color: "var(--pulse-muted)",
            borderColor: "var(--pulse-border)",
            background: "transparent",
          }}
        >
          ✕ Close
        </button>
      </div>
      <div className="grid grid-cols-2">
        <div style={{ borderRight: "1px solid var(--pulse-border)" }}>
          {left.map((n) => (
            <NicheSection
              key={n.name}
              niche={n.name}
              channels={n.channels}
              onChannelMoved={onChannelMoved}
            />
          ))}
        </div>
        <div>
          {right.map((n) => (
            <NicheSection
              key={n.name}
              niche={n.name}
              channels={n.channels}
              onChannelMoved={onChannelMoved}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

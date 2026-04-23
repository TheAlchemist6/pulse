"use client";

interface IdentityStripProps {
  archetype: string | null;
  summary: string | null;
  diversityScore: number | null;
  groupCount: number;
  channelCount: number;
}

export function IdentityStrip({
  archetype,
  summary,
  diversityScore,
  groupCount,
  channelCount,
}: IdentityStripProps) {
  const diversityPct = diversityScore != null ? Math.round(diversityScore * 100) : null;

  return (
    <div
      className="flex items-start justify-between gap-8 px-8 py-5"
      style={{
        background: "var(--pulse-amber-glow)",
        borderBottom: "1px solid var(--pulse-border)",
      }}
    >
      <div className="min-w-0 flex-1">
        <div
          className="text-[22px] italic leading-tight"
          style={{
            fontFamily: "var(--font-cormorant)",
            color: "var(--pulse-text)",
            fontWeight: 400,
          }}
        >
          {archetype ? `"${archetype}"` : "Your Pulse Map"}
        </div>
        {summary && (
          <p
            className="mt-2 text-[10px] leading-[1.6]"
            style={{
              fontFamily: "var(--font-dm-mono)",
              color: "var(--pulse-muted)",
              maxWidth: "520px",
            }}
          >
            {summary}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-start gap-7">
        <Stat value={diversityPct != null ? `${diversityPct}%` : "—"} label="Diversity" />
        <Stat value={String(groupCount)} label="Groups" />
        <Stat value={String(channelCount)} label="Channels" />
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-end">
      <div
        className="text-[24px] leading-none"
        style={{
          fontFamily: "var(--font-cormorant)",
          color: "var(--pulse-amber)",
          fontWeight: 400,
        }}
      >
        {value}
      </div>
      <div
        className="mt-1 text-[9px] uppercase tracking-[0.15em]"
        style={{ fontFamily: "var(--font-dm-mono)", color: "var(--pulse-muted)" }}
      >
        {label}
      </div>
    </div>
  );
}

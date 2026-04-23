"use client";

interface CategoryCardProps {
  group: string;
  channelCount: number;
  nicheCount: number;
  active: boolean;
  uncategorized?: boolean;
  onClick: () => void;
}

export function CategoryCard({
  group,
  channelCount,
  nicheCount,
  active,
  uncategorized = false,
  onClick,
}: CategoryCardProps) {
  return (
    <button
      onClick={onClick}
      className="group relative w-full overflow-hidden p-5 text-left transition-colors"
      style={{
        background: active ? "var(--pulse-amber-dim)" : "var(--pulse-surface)",
        border: uncategorized ? "1px solid rgba(245,158,11,0.2)" : "none",
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = "var(--pulse-surface-hover)";
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = "var(--pulse-surface)";
      }}
    >
      <div
        className="absolute right-4 top-4 text-[10px] transition-colors"
        style={{
          color: active ? "var(--pulse-amber)" : "var(--pulse-subtle)",
          fontFamily: "var(--font-dm-mono)",
        }}
      >
        {uncategorized ? "?" : active ? "▲" : "▼"}
      </div>

      <div
        className="text-[12px] leading-[1.3]"
        style={{
          fontFamily: "var(--font-cormorant)",
          color: active ? "var(--pulse-amber)" : "var(--pulse-text)",
          fontWeight: 400,
          marginBottom: "16px",
        }}
      >
        {group}
      </div>

      <div
        className="text-[32px] leading-none"
        style={{
          fontFamily: "var(--font-cormorant)",
          fontWeight: 300,
          color: active ? "var(--pulse-amber)" : "var(--pulse-text)",
        }}
      >
        {channelCount}
      </div>

      <div
        className="mt-1 text-[9px] uppercase tracking-[0.12em]"
        style={{
          fontFamily: "var(--font-dm-mono)",
          color: active ? "var(--pulse-amber)" : "var(--pulse-muted)",
          opacity: active ? 0.85 : 1,
        }}
      >
        {uncategorized ? "review needed" : `${nicheCount} ${nicheCount === 1 ? "niche" : "niches"}`}
      </div>

      <div
        className="absolute bottom-0 left-0 right-0 h-[2px] transition-transform duration-200"
        style={{
          background: "var(--pulse-amber)",
          transform: active ? "scaleX(1)" : "scaleX(0)",
          transformOrigin: "left",
        }}
      />
    </button>
  );
}

export function EmptyCard() {
  return (
    <div
      className="pointer-events-none p-5"
      style={{
        background: "var(--pulse-surface)",
        minHeight: "150px",
      }}
    />
  );
}

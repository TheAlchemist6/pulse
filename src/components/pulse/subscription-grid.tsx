"use client";

import { useMemo, useState } from "react";
import { CategoryCard, EmptyCard } from "./category-card";
import { ExpandedPanel } from "./expanded-panel";
import type { PulseChannel } from "./channel-row";
import type { Group, Niche } from "@/lib/classification/taxonomy";
import {
  NICHES_BY_GROUP,
  TIER1_GROUP_ORDER,
  UNCATEGORIZED_LABEL,
} from "@/lib/taxonomy";

interface SubscriptionGridProps {
  channels: PulseChannel[];
  onActiveGroupChange?: (group: string | null) => void;
}

interface GroupBucket {
  group: string;
  channels: PulseChannel[];
  nicheBuckets: { name: string; channels: PulseChannel[] }[];
  uncategorized?: boolean;
}

function bucketize(channels: PulseChannel[]): GroupBucket[] {
  // Single pass: index channels by (group, niche). Avoids 10×6×N filter sweeps.
  const byGroupNiche = new Map<Group, Map<string, PulseChannel[]>>();
  TIER1_GROUP_ORDER.forEach((g) => byGroupNiche.set(g, new Map()));
  const uncat: PulseChannel[] = [];

  for (const ch of channels) {
    const g = ch.primaryGroup as Group | null;
    const groupMap = g ? byGroupNiche.get(g) : undefined;
    if (!groupMap) {
      uncat.push(ch);
      continue;
    }
    const nicheKey = ch.primaryNiche ?? "__null__";
    const list = groupMap.get(nicheKey) ?? [];
    if (list.length === 0) groupMap.set(nicheKey, list);
    list.push(ch);
  }

  const buckets: GroupBucket[] = [];
  for (const group of TIER1_GROUP_ORDER) {
    const groupMap = byGroupNiche.get(group)!;
    const nicheBuckets: { name: string; channels: PulseChannel[] }[] = [];
    const orphans: PulseChannel[] = [];
    const validNiches = new Set<string>(NICHES_BY_GROUP[group]);

    for (const nicheName of NICHES_BY_GROUP[group]) {
      const list = groupMap.get(nicheName);
      if (list && list.length > 0) {
        nicheBuckets.push({ name: nicheName, channels: list });
      }
    }
    for (const [nicheKey, list] of groupMap) {
      if (!validNiches.has(nicheKey)) orphans.push(...list);
    }
    if (orphans.length > 0) {
      nicheBuckets.push({ name: "Other", channels: orphans });
    }

    const groupChannels = nicheBuckets.flatMap((nb) => nb.channels);
    buckets.push({ group, channels: groupChannels, nicheBuckets });
  }

  if (uncat.length > 0) {
    buckets.push({
      group: UNCATEGORIZED_LABEL,
      channels: uncat,
      nicheBuckets: [{ name: "Review needed", channels: uncat }],
      uncategorized: true,
    });
  }

  return buckets;
}

export function SubscriptionGrid({ channels: initialChannels, onActiveGroupChange }: SubscriptionGridProps) {
  const [channels, setChannels] = useState(initialChannels);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  const buckets = useMemo(() => bucketize(channels), [channels]);

  function handleCardClick(group: string) {
    const next = activeGroup === group ? null : group;
    setActiveGroup(next);
    onActiveGroupChange?.(next);
  }

  function handleChannelMoved(channelId: string, newGroup: Group, newNiche: Niche) {
    setChannels((prev) =>
      prev.map((c) =>
        c.channelId === channelId
          ? { ...c, primaryGroup: newGroup, primaryNiche: newNiche }
          : c
      )
    );
  }

  // Render the grid in rows of 5, injecting the panel after the row containing the active card
  const cols = 5;
  const rows: GroupBucket[][] = [];
  for (let i = 0; i < buckets.length; i += cols) {
    rows.push(buckets.slice(i, i + cols));
  }

  const activeBucket = activeGroup
    ? buckets.find((b) => b.group === activeGroup) ?? null
    : null;

  // Find which row the active card is in
  const activeRowIndex = activeBucket
    ? Math.floor(buckets.findIndex((b) => b.group === activeGroup) / cols)
    : -1;

  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: "repeat(5, 1fr)",
        gap: "1px",
        background: "var(--pulse-border)",
      }}
    >
      {rows.flatMap((row, rowIdx) => {
        const cells: React.ReactNode[] = row.map((b) => (
          <CategoryCard
            key={b.group}
            group={b.group}
            channelCount={b.channels.length}
            nicheCount={b.nicheBuckets.length}
            active={activeGroup === b.group}
            uncategorized={b.uncategorized}
            onClick={() => handleCardClick(b.group)}
          />
        ));
        // Pad last row with empty cells so grid lines stay clean
        while (cells.length < cols) {
          cells.push(<EmptyCard key={`empty-${rowIdx}-${cells.length}`} />);
        }
        // Inject panel after this row if active card is here
        if (rowIdx === activeRowIndex && activeBucket) {
          cells.push(
            <ExpandedPanel
              key={`panel-${activeBucket.group}`}
              group={activeBucket.group}
              niches={activeBucket.nicheBuckets}
              totalChannels={activeBucket.channels.length}
              onClose={() => {
                setActiveGroup(null);
                onActiveGroupChange?.(null);
              }}
              onChannelMoved={handleChannelMoved}
            />
          );
        }
        return cells;
      })}
    </div>
  );
}

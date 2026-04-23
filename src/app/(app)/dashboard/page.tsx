"use client";

import { useCallback, useEffect, useState } from "react";
import { Topbar } from "@/components/pulse/topbar";
import { IdentityStrip } from "@/components/pulse/identity-strip";
import { SubscriptionGrid } from "@/components/pulse/subscription-grid";
import type { PulseChannel } from "@/components/pulse/channel-row";
import { TIER1_GROUP_ORDER } from "@/lib/taxonomy";

interface SubscriptionResponseRow {
  channelId: string;
  channel: { title: string; thumbnailUrl: string | null } | null;
  primaryGroup: string | null;
  primaryNiche: string | null;
}

interface ProfileResponse {
  user: {
    name: string;
    archetype: string | null;
    profileSummary: string | null;
    diversityScore: number | null;
    subscriptionCount: number;
    onboardingStage: string;
  };
  stats: { total: number };
}

export default function DashboardPage() {
  const [channels, setChannels] = useState<PulseChannel[] | null>(null);
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [tooNarrow, setTooNarrow] = useState(false);
  const [loading, setLoading] = useState(true);

  // Desktop-only viewport check (spec: < 900px → notice)
  useEffect(() => {
    const check = () => setTooNarrow(window.innerWidth < 900);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const fetchAll = useCallback(async () => {
    try {
      const [subRes, profRes] = await Promise.all([
        fetch("/api/subscriptions?limit=2000"),
        fetch("/api/profile"),
      ]);
      if (subRes.ok) {
        const data: { subscriptions: SubscriptionResponseRow[] } = await subRes.json();
        const mapped: PulseChannel[] = data.subscriptions.map((s) => ({
          channelId: s.channelId,
          title: s.channel?.title ?? "(unknown channel)",
          thumbnailUrl: s.channel?.thumbnailUrl ?? null,
          primaryGroup: s.primaryGroup,
          primaryNiche: s.primaryNiche,
        }));
        setChannels(mapped);
        setLastSyncedAt(new Date());
      }
      if (profRes.ok) {
        const data: ProfileResponse = await profRes.json();
        setProfile(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  async function handleSync() {
    await fetch("/api/sync", { method: "POST" }).catch(() => null);
    await fetchAll();
  }

  if (tooNarrow) {
    return (
      <div
        className="flex h-screen items-center justify-center"
        style={{ background: "var(--pulse-bg)" }}
      >
        <p
          className="text-[12px]"
          style={{ fontFamily: "var(--font-dm-mono)", color: "var(--pulse-muted)" }}
        >
          Pulse Map works best on desktop.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div
        className="flex h-screen items-center justify-center"
        style={{ background: "var(--pulse-bg)" }}
      >
        <p
          className="text-[12px] uppercase tracking-[0.15em]"
          style={{ fontFamily: "var(--font-dm-mono)", color: "var(--pulse-muted)" }}
        >
          loading…
        </p>
      </div>
    );
  }

  const total = channels?.length ?? 0;
  const groupCount = TIER1_GROUP_ORDER.filter((g) =>
    (channels ?? []).some((c) => c.primaryGroup === g)
  ).length;

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ background: "var(--pulse-bg)" }}
    >
      <Topbar
        totalChannels={total}
        activeGroup={activeGroup}
        lastSyncedAt={lastSyncedAt}
        onSync={handleSync}
      />
      <IdentityStrip
        archetype={profile?.user.archetype ?? null}
        summary={profile?.user.profileSummary ?? null}
        diversityScore={profile?.user.diversityScore ?? null}
        groupCount={groupCount}
        channelCount={total}
      />
      {total === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <p
            className="text-[12px]"
            style={{
              fontFamily: "var(--font-dm-mono)",
              color: "var(--pulse-muted)",
            }}
          >
            Pulse Map found no subscriptions on this account.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <SubscriptionGrid
            channels={channels ?? []}
            onActiveGroupChange={setActiveGroup}
          />
        </div>
      )}
    </div>
  );
}

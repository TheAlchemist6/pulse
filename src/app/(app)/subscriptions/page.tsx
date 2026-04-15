"use client";

import { useState } from "react";
import { KanbanBoard } from "@/components/subscriptions/kanban-board";
import { ChannelDetailPanel } from "@/components/subscriptions/channel-detail-panel";
import { SubscriptionFilters } from "@/components/subscriptions/subscription-filters";
import type { Subscription, Category } from "@/lib/types";

export default function SubscriptionsPage() {
  const [selectedChannel, setSelectedChannel] = useState<Subscription | null>(null);
  const [filters, setFilters] = useState({
    status: "all" as "all" | "active" | "muted" | "archived",
    category: "all",
    confidence: "all" as "all" | "high" | "medium" | "low",
    search: "",
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Subscriptions</h1>
        <p className="text-muted-foreground mt-1">
          Drag channels between categories to reorganize
        </p>
      </div>

      <SubscriptionFilters filters={filters} onFiltersChange={setFilters} />

      <div className="relative">
        <KanbanBoard
          filters={filters}
          onChannelSelect={setSelectedChannel}
        />
      </div>

      {selectedChannel && (
        <ChannelDetailPanel
          channel={selectedChannel}
          onClose={() => setSelectedChannel(null)}
        />
      )}
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverEvent,
  Over,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChannelCard, ChannelCardOverlay } from "./channel-card";
import type { Subscription, Category } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface KanbanBoardProps {
  filters: {
    status: "all" | "active" | "muted" | "archived";
    category: string;
    confidence: "all" | "high" | "medium" | "low";
    search: string;
  };
  onChannelSelect: (channel: Subscription) => void;
}

interface KanbanColumnProps {
  id: string;
  title: string;
  channels: Subscription[];
  onChannelSelect: (channel: Subscription) => void;
  isOver: boolean;
}

function KanbanColumn({ id, title, channels, onChannelSelect, isOver }: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col min-w-[280px] max-w-[320px] flex-shrink-0 rounded-lg transition-colors",
        isOver && "bg-primary/5 ring-2 ring-primary/20"
      )}
    >
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="font-semibold text-sm">{title}</h3>
        <Badge variant="secondary" className="text-xs">
          {channels.length}
        </Badge>
      </div>
      <SortableContext
        items={channels.map((c) => c.channel_id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2 min-h-[200px]">
          {channels.map((channel) => (
            <ChannelCard
              key={channel.channel_id}
              channel={channel}
              onClick={() => onChannelSelect(channel)}
            />
          ))}
          {channels.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No channels
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

export function KanbanBoard({ filters, onChannelSelect }: KanbanBoardProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [channels, setChannels] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Fetch categories
  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch("/api/categories");
        if (res.ok) {
          const data = await res.json();
          setCategories(data.categories || []);
        }
      } catch (error) {
        console.error("Failed to fetch categories:", error);
      }
    }
    fetchCategories();
  }, []);

  // Fetch channels with filters
  useEffect(() => {
    async function fetchChannels() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (filters.status !== "all") params.set("status", filters.status);
        if (filters.category !== "all") params.set("category", filters.category);
        if (filters.confidence === "high") params.set("confidence", "high");
        if (filters.confidence === "low") params.set("confidence", "low");
        if (filters.search) params.set("search", filters.search);

        const res = await fetch(`/api/subscriptions?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setChannels(data.subscriptions || []);
        }
      } catch (error) {
        console.error("Failed to fetch channels:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchChannels();
  }, [filters]);

  // Group channels by category
  const channelsByCategory = categories.reduce(
    (acc, cat) => {
      acc[cat.name] = channels.filter((c) => c.primary_category === cat.name);
      return acc;
    },
    {} as Record<string, Subscription[]>
  );

  // Add uncategorized column for channels without a matching category
  const uncategorizedChannels = channels.filter(
    (c) => !categories.find((cat) => cat.name === c.primary_category)
  );
  if (uncategorizedChannels.length > 0) {
    channelsByCategory["Uncategorized"] = uncategorizedChannels;
  }

  const activeChannel = activeId
    ? channels.find((c) => c.channel_id === activeId)
    : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    setOverId(over?.id as string | null);
  };

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);
      setOverId(null);

      if (!over) return;

      const activeChannelId = active.id as string;
      const overId = over.id as string;

      // Find the channel being dragged
      const channel = channels.find((c) => c.channel_id === activeChannelId);
      if (!channel) return;

      // Determine target category - could be a column or another channel
      let targetCategory: string | null = null;

      // Check if over is a category column
      const targetCat = categories.find((c) => c.name === overId);
      if (targetCat) {
        targetCategory = targetCat.name;
      } else {
        // Over is another channel - find its category
        const overChannel = channels.find((c) => c.channel_id === overId);
        if (overChannel) {
          targetCategory = overChannel.primary_category;
        }
      }

      if (!targetCategory || targetCategory === channel.primary_category) return;

      // Optimistically update local state
      setChannels((prev) =>
        prev.map((c) =>
          c.channel_id === activeChannelId
            ? { ...c, primary_category: targetCategory!, user_overridden: true }
            : c
        )
      );

      // Persist to API
      try {
        const res = await fetch("/api/subscriptions/bulk", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            channelIds: [activeChannelId],
            primaryCategory: targetCategory,
          }),
        });

        if (!res.ok) {
          // Revert on failure
          setChannels((prev) =>
            prev.map((c) =>
              c.channel_id === activeChannelId
                ? { ...c, primary_category: channel.primary_category, user_overridden: false }
                : c
            )
          );
        }
      } catch (error) {
        console.error("Failed to update channel category:", error);
        // Revert on error
        setChannels((prev) =>
          prev.map((c) =>
            c.channel_id === activeChannelId
              ? { ...c, primary_category: channel.primary_category, user_overridden: false }
              : c
          )
        );
      }
    },
    [channels, categories]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {Object.entries(channelsByCategory).map(([categoryName, categoryChannels]) => (
          <KanbanColumn
            key={categoryName}
            id={categoryName}
            title={categoryName}
            channels={categoryChannels}
            onChannelSelect={onChannelSelect}
            isOver={overId === categoryName}
          />
        ))}
        {Object.keys(channelsByCategory).length === 0 && (
          <div className="text-center py-12 text-muted-foreground w-full">
            No channels found. Try adjusting your filters.
          </div>
        )}
      </div>

      <DragOverlay>
        {activeChannel && <ChannelCardOverlay channel={activeChannel} />}
      </DragOverlay>
    </DndContext>
  );
}

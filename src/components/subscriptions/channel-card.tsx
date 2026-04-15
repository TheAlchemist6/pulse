"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GripVertical, Star } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import type { Subscription } from "@/lib/types";

interface ChannelCardProps {
  channel: Subscription;
  onClick: () => void;
  isSelected?: boolean;
}

export function ChannelCard({ channel, onClick, isSelected }: ChannelCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: channel.channel_id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const confidenceColor =
    channel.ai_confidence >= 4
      ? "bg-green-500"
      : channel.ai_confidence <= 2
      ? "bg-amber-500"
      : "bg-blue-500";

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "cursor-pointer hover:border-primary/50 transition-all duration-200",
        isDragging && "opacity-50 shadow-lg ring-2 ring-primary",
        isSelected && "border-primary ring-1 ring-primary"
      )}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          {/* Drag handle */}
          <button
            className="mt-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors"
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-4 w-4" />
          </button>

          {/* Channel avatar */}
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarImage
              src={channel.channel.thumbnail_url || ""}
              alt={channel.channel.title}
            />
            <AvatarFallback className="text-xs">
              {channel.channel.title.charAt(0)}
            </AvatarFallback>
          </Avatar>

          {/* Channel info */}
          <div className="flex-1 min-w-0">
            {/* Title with confidence dot */}
            <div className="flex items-center gap-2">
              <span
                className={cn("w-2 h-2 rounded-full flex-shrink-0", confidenceColor)}
                title={`Confidence: ${channel.ai_confidence}/5`}
              />
              <p className="font-medium text-sm truncate">{channel.channel.title}</p>
            </div>

            {/* Subscriber count and cadence */}
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {channel.channel.subscriber_count
                ? `${formatNumber(Number(channel.channel.subscriber_count))} subscribers`
                : "Unknown subscribers"}
              {channel.posting_cadence && ` • ${channel.posting_cadence}`}
            </p>

            {/* Badges row */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <Badge
                variant="secondary"
                className="text-xs font-normal px-1.5 py-0.5"
              >
                {channel.primary_category}
              </Badge>

              {/* Status badge */}
              {channel.status === "active" && (
                <Badge
                  variant="default"
                  className="text-xs font-normal px-1.5 py-0.5 bg-green-100 text-green-700 hover:bg-green-100"
                >
                  Active
                </Badge>
              )}
              {channel.status === "muted" && (
                <Badge
                  variant="outline"
                  className="text-xs font-normal px-1.5 py-0.5 text-amber-600 border-amber-300"
                >
                  Muted
                </Badge>
              )}
              {channel.status === "archived" && (
                <Badge
                  variant="outline"
                  className="text-xs font-normal px-1.5 py-0.5 text-gray-600 border-gray-300"
                >
                  Archived
                </Badge>
              )}

              {/* Low confidence indicator */}
              {channel.ai_confidence <= 2 && (
                <Badge
                  variant="outline"
                  className="text-xs font-normal px-1.5 py-0.5 text-amber-600 border-amber-300"
                >
                  Needs review
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Overlay card shown while dragging
export function ChannelCardOverlay({ channel }: { channel: Subscription }) {
  const confidenceColor =
    channel.ai_confidence >= 4
      ? "bg-green-500"
      : channel.ai_confidence <= 2
      ? "bg-amber-500"
      : "bg-blue-500";

  return (
    <Card className="shadow-xl opacity-90 rotate-3 cursor-grabbing">
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <GripVertical className="h-4 w-4 text-muted-foreground mt-1" />
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarImage
              src={channel.channel.thumbnail_url || ""}
              alt={channel.channel.title}
            />
            <AvatarFallback className="text-xs">
              {channel.channel.title.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={cn("w-2 h-2 rounded-full flex-shrink-0", confidenceColor)}
              />
              <p className="font-medium text-sm truncate">{channel.channel.title}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {channel.channel.subscriber_count
                ? `${formatNumber(Number(channel.channel.subscriber_count))} subscribers`
                : "Unknown subscribers"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

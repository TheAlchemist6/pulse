"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Subscription } from "@/lib/types";

interface ChannelDetailPanelProps {
  channel: Subscription;
  onClose: () => void;
}

export function ChannelDetailPanel({ channel, onClose }: ChannelDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<"details" | "category">("details");

  return (
    <div className="fixed right-0 top-0 h-full w-[400px] bg-background border-l shadow-lg z-50 animate-in slide-in-from-right">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-semibold">Channel Details</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={channel.channel.thumbnail_url || ""} />
            <AvatarFallback>{channel.channel.title.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-lg">{channel.channel.title}</h3>
            <p className="text-sm text-muted-foreground">
              {channel.channel.subscriber_count} subscribers
            </p>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Badge variant="secondary">{channel.primary_category}</Badge>
          {channel.secondary_category && (
            <Badge variant="outline">{channel.secondary_category}</Badge>
          )}
        </div>

        <Separator className="my-4" />

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">AI Confidence</span>
            <span>{channel.ai_confidence}/5</span>
          </div>
          {channel.ai_reasoning && (
            <div>
              <span className="text-muted-foreground block mb-1">AI Reasoning</span>
              <p className="bg-muted p-2 rounded text-xs">{channel.ai_reasoning}</p>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status</span>
            <Badge variant={channel.status === "active" ? "default" : "secondary"}>
              {channel.status}
            </Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Videos</span>
            <span>{channel.channel.video_count || "Unknown"}</span>
          </div>
          {channel.channel.country && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Country</span>
              <span>{channel.channel.country}</span>
            </div>
          )}
        </div>

        <Separator className="my-4" />

        <div className="space-y-2">
          <Button className="w-full" variant="outline">
            Move to Category
          </Button>
          <Button className="w-full" variant="outline">
            {channel.status === "muted" ? "Unmute" : "Mute"}
          </Button>
          <Button className="w-full" variant="outline">
            Archive
          </Button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowRight } from "lucide-react";

interface NeedsAttentionProps {
  userId?: string;
}

interface AttentionItem {
  id: string;
  type: "dead" | "redundancy" | "low_confidence";
  title: string;
  description: string;
  channelId: string;
}

export function NeedsAttention({ userId }: NeedsAttentionProps) {
  // TODO: Fetch actual attention items from API
  const items: AttentionItem[] = [];

  if (items.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Needs Attention
        </CardTitle>
        <CardDescription>
          Channels that may need your review
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-4 rounded-lg border"
            >
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
              <Button variant="ghost" size="sm">
                Review <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

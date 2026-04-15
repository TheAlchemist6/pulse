"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Calendar } from "lucide-react";

interface EraChannel {
  channelId: string;
  title: string;
}

interface SubscriptionEra {
  period: string;
  name: string;
  theme: string;
  channels: EraChannel[];
}

interface SubscriptionTimelineProps {
  userId?: string;
}

export function SubscriptionTimeline({ userId }: SubscriptionTimelineProps) {
  const [eras, setEras] = useState<SubscriptionEra[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedEras, setExpandedEras] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function fetchTimeline() {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const data = await res.json();
          setEras(data.subscriptionEras || []);
        }
      } catch (error) {
        console.error("Failed to fetch subscription timeline:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchTimeline();
  }, [userId]);

  const toggleEra = (period: string) => {
    const newExpanded = new Set(expandedEras);
    if (newExpanded.has(period)) {
      newExpanded.delete(period);
    } else {
      newExpanded.add(period);
    }
    setExpandedEras(newExpanded);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Subscription Timeline
          </CardTitle>
          <CardDescription>Your subscription journey through time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-muted rounded-lg" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (eras.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Subscription Timeline
          </CardTitle>
          <CardDescription>Your subscription journey through time</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No timeline data available yet. Subscribe to some channels to see your journey.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Subscription Timeline
        </CardTitle>
        <CardDescription>Your subscription journey through time</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />
          
          <div className="space-y-4">
            {eras.map((era, index) => (
              <div key={era.period} className="relative pl-14">
                {/* Timeline dot */}
                <div className="absolute left-4 w-5 h-5 rounded-full bg-primary border-4 border-background ring-2 ring-primary" />
                
                {/* Era card */}
                <div
                  className="bg-muted/50 rounded-lg border p-4 cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => toggleEra(era.period)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-lg">{era.period}</span>
                      <Badge variant="secondary">{era.name}</Badge>
                    </div>
                    {expandedEras.has(era.period) ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  
                  <p className="text-sm text-muted-foreground mt-1 italic">
                    &quot;{era.theme}&quot;
                  </p>
                  
                  {/* Channel count */}
                  <p className="text-xs text-muted-foreground mt-2">
                    {era.channels.length} channel{era.channels.length !== 1 ? "s" : ""}
                  </p>
                  
                  {/* Expanded channels */}
                  {expandedEras.has(era.period) && era.channels.length > 0 && (
                    <div className="mt-4 pt-4 border-t space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Channels from this era
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {era.channels.map((channel) => (
                          <Badge key={channel.channelId} variant="outline" className="font-normal">
                            {channel.title}
                          </Badge>
                        ))}
                      </div>
                      {era.channels.length >= 5 && (
                        <p className="text-xs text-muted-foreground mt-2">
                          + more channels from this era
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

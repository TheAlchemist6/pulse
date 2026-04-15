"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";
import { Layers, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";

interface StatsGridProps {
  userId?: string;
}

interface Stats {
  totalSubscriptions: number;
  activeCategories: number;
  deadChannels: number;
  reviewedChannels: number;
}

export function StatsGrid({ userId }: StatsGridProps) {
  const [stats, setStats] = useState<Stats>({
    totalSubscriptions: 0,
    activeCategories: 0,
    deadChannels: 0,
    reviewedChannels: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch actual stats from API
    // For now, set loading to false with placeholder data
    setLoading(false);
  }, [userId]);

  const statCards = [
    {
      title: "Total Subscriptions",
      value: stats.totalSubscriptions,
      description: "channels in your library",
      icon: Layers,
    },
    {
      title: "Active Categories",
      value: stats.activeCategories,
      description: "organized into categories",
      icon: TrendingUp,
    },
    {
      title: "Dead Channels",
      value: stats.deadChannels,
      description: "no upload in 6+ months",
      icon: AlertTriangle,
    },
    {
      title: "Reviewed",
      value: stats.reviewedChannels,
      description: "channels triaged",
      icon: CheckCircle2,
    },
  ];

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-1/2" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stat.value)}</div>
            <p className="text-xs text-muted-foreground">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

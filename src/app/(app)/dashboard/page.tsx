"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Layers, TrendingUp, AlertTriangle, CheckCircle2, Loader2, Fingerprint } from "lucide-react";
import { formatNumber } from "@/lib/utils";

interface ProfileData {
  user: {
    name: string;
    archetype: string | null;
    profileSummary: string | null;
    dominantThemes: string[] | null;
    topCategories: { name: string; count: number }[];
    subscriptionCount: number;
    deadChannelCount: number;
    diversityScore: number | null;
    onboardingStage: string;
  };
  stats: {
    total: number;
    active: number;
    muted: number;
    archived: number;
    dead: number;
    reviewed: number;
    reviewProgress: number;
  };
  subscriptionEras?: {
    period: string;
    name: string;
    channels: (string | { channelId?: string; title?: string })[];
    theme: string;
  }[];
}

interface InsightsData {
  deadChannels: { channelId: string; title: string }[];
  lowConfidence: { channelId: string; title: string; currentCategory: string; confidence: number }[];
  redundancies: { topic: string; channels: string[] }[];
  needsAttentionCount: number;
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [profileRes, insightsRes] = await Promise.all([
          fetch("/api/profile"),
          fetch("/api/insights"),
        ]);
        if (profileRes.ok) setProfile(await profileRes.json());
        if (insightsRes.ok) setInsights(await insightsRes.json());
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const user = profile?.user;
  const stats = profile?.stats;

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Subscriptions</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats?.total || 0)}</div>
            <p className="text-xs text-muted-foreground">channels in your library</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats?.active || 0)}</div>
            <p className="text-xs text-muted-foreground">channels you're tracking</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Dead Channels</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(user?.deadChannelCount || 0)}</div>
            <p className="text-xs text-muted-foreground">no upload in 6+ months</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Reviewed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats?.reviewed || 0)}</div>
            <p className="text-xs text-muted-foreground">of {stats?.total || 0} triaged</p>
          </CardContent>
        </Card>
      </div>

      {/* Profile + Archetype */}
      {(user?.archetype || user?.profileSummary) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Fingerprint className="h-5 w-5 text-primary" />
              Your Subscription Identity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {user?.archetype && (
              <p className="text-2xl font-bold tracking-tight">&ldquo;{user.archetype}&rdquo;</p>
            )}
            {user?.profileSummary && (
              <p className="text-muted-foreground">{user.profileSummary}</p>
            )}
            {user?.dominantThemes && user.dominantThemes.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {user.dominantThemes.map((theme) => {
                  const label = typeof theme === "string" ? theme : String(theme);
                  return <Badge key={label} variant="secondary">{label}</Badge>;
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Category Breakdown</CardTitle>
            <CardDescription>Channels per category</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {user?.topCategories && user.topCategories.length > 0 ? (
              user.topCategories.map((cat) => (
                <div key={cat.name} className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground w-40 truncate">{cat.name}</span>
                  <div className="flex-1 bg-muted rounded-full h-5 overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                      style={{
                        width: `${Math.min((cat.count / (stats?.total || 1)) * 100, 100)}%`,
                        minWidth: "2rem",
                      }}
                    >
                      <span className="text-[10px] font-medium text-primary-foreground">{cat.count}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No category data yet</p>
            )}
          </CardContent>
        </Card>

        {/* Diversity Score */}
        <Card>
          <CardHeader>
            <CardTitle>Diversity Score</CardTitle>
            <CardDescription>How varied is your subscription landscape?</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-8">
            {user?.diversityScore != null ? (
              <>
                <div className="text-5xl font-bold text-primary">
                  {(user.diversityScore * 100).toFixed(0)}%
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {user.diversityScore > 0.8
                    ? "Well-rounded — diverse interests"
                    : user.diversityScore > 0.6
                    ? "Moderately diverse"
                    : "Concentrated in a few areas"}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No score yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Inbox Zero Progress */}
      {stats && stats.total > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Inbox Zero Progress</CardTitle>
            <CardDescription>
              {stats.reviewed} of {stats.total} channels reviewed ({(stats.reviewProgress * 100).toFixed(0)}%)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={stats.reviewProgress * 100} className="h-3" />
          </CardContent>
        </Card>
      )}

      {/* Needs Attention */}
      {insights && insights.needsAttentionCount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Needs Attention
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.deadChannels.length > 0 && (
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="font-medium">{insights.deadChannels.length} dead channels</p>
                  <p className="text-sm text-muted-foreground">No uploads in 6+ months</p>
                </div>
              </div>
            )}
            {insights.lowConfidence.length > 0 && (
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="font-medium">{insights.lowConfidence.length} uncertain classifications</p>
                  <p className="text-sm text-muted-foreground">AI confidence was low — review these</p>
                </div>
              </div>
            )}
            {insights.redundancies.length > 0 && (
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="font-medium">{insights.redundancies.length} redundant topic clusters</p>
                  <p className="text-sm text-muted-foreground">Multiple channels covering the same niche</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Subscription Timeline */}
      {profile?.subscriptionEras && profile.subscriptionEras.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Subscription Timeline</CardTitle>
            <CardDescription>Your subscription story over the years</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative pl-8 space-y-6">
              <div className="absolute left-3 top-2 bottom-2 w-px bg-border" />
              {profile.subscriptionEras.map((era, i) => (
                <div key={i} className="relative">
                  <div className="absolute -left-5 top-1 h-3 w-3 rounded-full bg-primary ring-4 ring-background" />
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-medium">{era.period}</p>
                    <p className="font-semibold">{era.name}</p>
                    <p className="text-sm text-muted-foreground">{era.theme}</p>
                    {era.channels.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {era.channels.slice(0, 4).map((ch, ci) => {
                          const label = typeof ch === "string" ? ch : (ch.title || "Unknown");
                          return <Badge key={ci} variant="outline" className="text-xs font-normal">{label}</Badge>;
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

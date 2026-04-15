"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, X, Archive, ChevronRight, Sparkles } from "lucide-react";
import type { Subscription } from "@/lib/types";
import { formatNumber } from "@/lib/utils";

interface TriageState {
  unreviewed: Subscription[];
  currentIndex: number;
  reviewed: number;
  total: number;
  status: "active" | "muted" | "archived";
  isComplete: boolean;
  stats: {
    active: number;
    muted: number;
    archived: number;
  };
}

export default function TriagePage() {
  const router = useRouter();
  const [state, setState] = useState<TriageState>({
    unreviewed: [],
    currentIndex: 0,
    reviewed: 0,
    total: 0,
    status: "active",
    isComplete: false,
    stats: { active: 0, muted: 0, archived: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch unreviewed subscriptions
  useEffect(() => {
    async function fetchUnreviewed() {
      try {
        const res = await fetch("/api/subscriptions?reviewed=false&limit=100");
        if (res.ok) {
          const data = await res.json();
          const subs = data.subscriptions || [];
          setState((prev) => ({
            ...prev,
            unreviewed: subs,
            currentIndex: 0,
            total: subs.length + prev.reviewed,
          }));
        }
      } catch (error) {
        console.error("Failed to fetch unreviewed subscriptions:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchUnreviewed();
  }, []);

  const currentChannel = state.unreviewed[state.currentIndex];
  const remaining = state.unreviewed.length - state.currentIndex;
  const progress = state.total > 0 ? (state.reviewed / state.total) * 100 : 0;

  const handleAction = useCallback(
    async (action: "active" | "muted" | "archived") => {
      if (!currentChannel) return;

      setActionLoading(true);
      try {
        const res = await fetch("/api/subscriptions/bulk", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            channelIds: [currentChannel.channel_id],
            status: action,
          }),
        });

        if (res.ok) {
          setState((prev) => {
            const newStats = { ...prev.stats };
            newStats[action]++;

            const nextIndex = prev.currentIndex + 1;
            const isComplete = nextIndex >= prev.unreviewed.length;

            return {
              ...prev,
              currentIndex: isComplete ? prev.currentIndex : nextIndex,
              reviewed: prev.reviewed + 1,
              status: action,
              isComplete,
              stats: newStats,
            };
          });
        }
      } catch (error) {
        console.error("Failed to update subscription:", error);
      } finally {
        setActionLoading(false);
      }
    },
    [currentChannel]
  );

  const handleSkip = useCallback(() => {
    setState((prev) => {
      const nextIndex = prev.currentIndex + 1;
      const isComplete = nextIndex >= prev.unreviewed.length;

      return {
        ...prev,
        currentIndex: isComplete ? prev.currentIndex : nextIndex,
        isComplete,
      };
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your subscriptions...</p>
        </div>
      </div>
    );
  }

  // Completion state
  if (state.isComplete || state.unreviewed.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-lg w-full text-center">
          <CardContent className="pt-8 pb-8">
            <div className="mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight mb-2">Inbox Zero</h1>
              <p className="text-muted-foreground text-lg">
                Subscription inbox cleared
              </p>
            </div>

            <div className="mb-8">
              <p className="text-4xl font-bold mb-2">
                {state.reviewed}/{state.total}
              </p>
              <p className="text-sm text-muted-foreground">reviewed</p>
            </div>

            <div className="flex justify-center gap-8 mb-8">
              <div className="text-center">
                <p className="text-2xl font-semibold text-green-600">
                  {state.stats.active}
                </p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-semibold text-amber-600">
                  {state.stats.muted}
                </p>
                <p className="text-sm text-muted-foreground">Muted</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-semibold text-gray-600">
                  {state.stats.archived}
                </p>
                <p className="text-sm text-muted-foreground">Archived</p>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 mb-8">
              <p className="text-sm text-muted-foreground italic">
                &quot;You&apos;ve consciously reviewed every subscription in your YouTube
                account. Most people never do.&quot;
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard")}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Share your DNA
              </Button>
              <Button onClick={() => router.push("/subscriptions")}>
                Go to Board
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold tracking-tight">Subscription Inbox</h1>
            <Button
              variant="ghost"
              onClick={() => router.push("/subscriptions")}
              className="text-muted-foreground"
            >
              Skip to Kanban
            </Button>
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {state.reviewed} reviewed
              </span>
              <span className="font-medium">{progress.toFixed(0)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>

        {/* Channel card */}
        {currentChannel && (
          <Card className="mb-6">
            <CardContent className="pt-8 pb-8">
              {/* Channel info */}
              <div className="text-center mb-8">
                <Avatar className="h-20 w-20 mx-auto mb-4">
                  <AvatarImage
                    src={currentChannel.channel.thumbnail_url || ""}
                    alt={currentChannel.channel.title}
                  />
                  <AvatarFallback className="text-xl">
                    {currentChannel.channel.title.charAt(0)}
                  </AvatarFallback>
                </Avatar>

                <h2 className="text-xl font-semibold mb-2">
                  {currentChannel.channel.title}
                </h2>

                <p className="text-muted-foreground mb-4">
                  {currentChannel.channel.subscriber_count
                    ? `${formatNumber(Number(currentChannel.channel.subscriber_count))} subscribers`
                    : "Unknown subscribers"}{" "}
                  {currentChannel.posting_cadence && `• ${currentChannel.posting_cadence}`}
                </p>

                <div className="flex justify-center gap-2 mb-6">
                  <Badge variant="secondary">
                    {currentChannel.primary_category}
                  </Badge>
                  {currentChannel.ai_confidence >= 4 && (
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                      High confidence
                    </Badge>
                  )}
                  {currentChannel.ai_confidence <= 2 && (
                    <Badge variant="outline" className="text-amber-600 border-amber-300">
                      Low confidence
                    </Badge>
                  )}
                </div>
              </div>

              {/* Description */}
              {currentChannel.channel.description && (
                <div className="bg-muted/50 rounded-lg p-4 mb-6">
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    &quot;{currentChannel.channel.description}&quot;
                  </p>
                </div>
              )}

              {/* AI reasoning */}
              {currentChannel.ai_reasoning && (
                <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 mb-6 border border-blue-100 dark:border-blue-900">
                  <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
                    AI Reasoning
                  </p>
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    {currentChannel.ai_reasoning}
                  </p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  className="flex-1 h-12"
                  onClick={() => handleAction("muted")}
                  disabled={actionLoading}
                >
                  <X className="mr-2 h-4 w-4" />
                  Mute
                </Button>
                <Button
                  className="flex-1 h-12 bg-green-600 hover:bg-green-700"
                  onClick={() => handleAction("active")}
                  disabled={actionLoading}
                >
                  <Check className="mr-2 h-4 w-4" />
                  Keep Active
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 h-12"
                  onClick={() => handleAction("archived")}
                  disabled={actionLoading}
                >
                  <Archive className="mr-2 h-4 w-4" />
                  Archive
                </Button>
              </div>

              {/* Remaining count */}
              <p className="text-center text-sm text-muted-foreground mt-6">
                {remaining} remaining
              </p>
            </CardContent>
          </Card>
        )}

        {/* Skip button */}
        <div className="text-center">
          <Button variant="link" onClick={handleSkip} className="text-muted-foreground">
            Skip this channel
          </Button>
        </div>
      </div>
    </div>
  );
}

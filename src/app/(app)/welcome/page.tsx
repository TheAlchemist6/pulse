"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, ChevronRight, AlertTriangle, GitMerge, HelpCircle, Sparkles, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Insights {
  deadChannels: { channelId: string; title: string; lastUploadAt: string | null }[];
  lowConfidence: { channelId: string; title: string; currentCategory: string; confidence: number }[];
  redundancies: { topic: string; channels: string[] }[];
  needsAttentionCount: number;
}

interface ProfileData {
  profileSummary: string | null;
  dominantThemes: string[];
  topCategories: { name: string; count: number }[];
  subscriptionCount: number;
}

interface WelcomeState {
  profile: ProfileData | null;
  insights: Insights | null;
  loading: boolean;
  expandedSection: string | null;
  deadChannelIds: Set<string>;
}

export default function WelcomePage() {
  const router = useRouter();
  const [state, setState] = useState<WelcomeState>({
    profile: null,
    insights: null,
    loading: true,
    expandedSection: null,
    deadChannelIds: new Set(),
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const [profileRes, insightsRes] = await Promise.all([
          fetch("/api/profile"),
          fetch("/api/insights"),
        ]);

        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setState((prev) => ({ ...prev, profile: profileData.user || profileData }));
        }

        if (insightsRes.ok) {
          const insightsData = await insightsRes.json();
          setState((prev) => ({
            ...prev,
            insights: insightsData,
          }));
        }
      } catch (error) {
        console.error("Failed to fetch welcome data:", error);
      } finally {
        setState((prev) => ({ ...prev, loading: false }));
      }
    }

    fetchData();
  }, []);

  const toggleSection = (section: string) => {
    setState((prev) => ({
      ...prev,
      expandedSection: prev.expandedSection === section ? null : section,
    }));
  };

  const handleArchiveDead = async (channelId: string) => {
    try {
      await fetch("/api/subscriptions/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelIds: [channelId],
          status: "archived",
        }),
      });

      setState((prev) => {
        const newDeadIds = new Set(prev.deadChannelIds);
        newDeadIds.add(channelId);
        return { ...prev, deadChannelIds: newDeadIds };
      });
    } catch (error) {
      console.error("Failed to archive channel:", error);
    }
  };

  const handleMuteDuplicate = async (channelId: string) => {
    try {
      await fetch("/api/subscriptions/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelIds: [channelId],
          status: "muted",
        }),
      });
    } catch (error) {
      console.error("Failed to mute channel:", error);
    }
  };

  if (state.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Analyzing your subscriptions...</p>
        </div>
      </div>
    );
  }

  const { profile, insights } = state;
  const deadChannels = insights?.deadChannels.filter((c) => !state.deadChannelIds.has(c.channelId)) || [];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="max-w-2xl w-full">
        <CardContent className="pt-8 pb-8">
          {/* Logo/Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Sparkles className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold">Pulse</span>
            </div>
            {profile?.subscriptionCount ? (
              <p className="text-lg text-muted-foreground">
                I found <span className="font-semibold text-foreground">{profile.subscriptionCount}</span> channels in your subscriptions.
              </p>
            ) : (
              <p className="text-lg text-muted-foreground">
                Welcome to Pulse!
              </p>
            )}
          </div>

          {/* Profile Summary */}
          {profile?.profileSummary && (
            <div className="bg-muted/50 rounded-lg p-4 mb-6">
              <p className="text-sm text-muted-foreground italic">
                &quot;{profile.profileSummary}&quot;
              </p>
            </div>
          )}

          {/* Top Categories */}
          {profile?.topCategories && profile.topCategories.length > 0 && (
            <div className="mb-6">
              <p className="text-sm text-muted-foreground mb-3">
                Here&apos;s what I see:
              </p>
              <div className="space-y-2">
                {profile.topCategories.slice(0, 3).map((cat) => (
                  <div key={cat.name} className="flex items-center gap-2">
                    <Badge variant="secondary">{cat.count}</Badge>
                    <span className="text-sm">{cat.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Insights Section */}
          <div className="space-y-4 mb-8">
            <h3 className="font-semibold text-lg">A few things caught my eye:</h3>

            {/* Dead Channels */}
            {deadChannels.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleSection("dead")}
                  className={cn(
                    "w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors",
                    state.expandedSection === "dead" && "bg-muted/50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    <span>
                      <span className="font-medium">{deadChannels.length}</span> channel{deadChannels.length !== 1 ? "s" : ""} haven&apos;t posted in 6+ months
                    </span>
                  </div>
                  {state.expandedSection === "dead" ? (
                    <ChevronRight className="h-4 w-4 rotate-90 transition-transform" />
                  ) : (
                    <ChevronRight className="h-4 w-4 transition-transform" />
                  )}
                </button>

                {state.expandedSection === "dead" && (
                  <div className="p-4 border-t bg-muted/30">
                    <p className="text-sm text-muted-foreground mb-3">
                      These channels may be abandoned. Archive them to clean up your board.
                    </p>
                    <div className="space-y-2">
                      {deadChannels.slice(0, 5).map((channel) => (
                        <div
                          key={channel.channelId}
                          className="flex items-center justify-between bg-background rounded-lg p-3"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>{channel.title.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium truncate">{channel.title}</span>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleArchiveDead(channel.channelId)}
                          >
                            Archive
                          </Button>
                        </div>
                      ))}
                    </div>
                    {deadChannels.length > 5 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        + {deadChannels.length - 5} more dead channels
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Redundancies */}
            {insights?.redundancies && insights.redundancies.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleSection("redundant")}
                  className={cn(
                    "w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors",
                    state.expandedSection === "redundant" && "bg-muted/50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <GitMerge className="h-5 w-5 text-blue-500" />
                    <span>
                      You have overlapping channels that might be redundant
                    </span>
                  </div>
                  {state.expandedSection === "redundant" ? (
                    <ChevronRight className="h-4 w-4 rotate-90 transition-transform" />
                  ) : (
                    <ChevronRight className="h-4 w-4 transition-transform" />
                  )}
                </button>

                {state.expandedSection === "redundant" && (
                  <div className="p-4 border-t bg-muted/30">
                    <p className="text-sm text-muted-foreground mb-3">
                      Consider muting some of these to reduce noise.
                    </p>
                    <div className="space-y-3">
                      {insights.redundancies.slice(0, 3).map((redundancy, idx) => (
                        <div key={idx} className="bg-background rounded-lg p-3">
                          <p className="text-sm font-medium mb-2">{redundancy.topic}</p>
                          <div className="flex flex-wrap gap-2">
                            {redundancy.channels.slice(0, 4).map((channelId) => (
                              <Badge key={channelId} variant="outline" className="font-normal">
                                {channelId.slice(0, 8)}...
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Low Confidence */}
            {insights?.lowConfidence && insights.lowConfidence.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleSection("uncertain")}
                  className={cn(
                    "w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors",
                    state.expandedSection === "uncertain" && "bg-muted/50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <HelpCircle className="h-5 w-5 text-purple-500" />
                    <span>
                      <span className="font-medium">{insights.lowConfidence.length}</span> channels I wasn&apos;t sure how to categorize
                    </span>
                  </div>
                  {state.expandedSection === "uncertain" ? (
                    <ChevronRight className="h-4 w-4 rotate-90 transition-transform" />
                  ) : (
                    <ChevronRight className="h-4 w-4 transition-transform" />
                  )}
                </button>

                {state.expandedSection === "uncertain" && (
                  <div className="p-4 border-t bg-muted/30">
                    <p className="text-sm text-muted-foreground mb-3">
                      Help me get these right by reviewing them on the board.
                    </p>
                    <Button
                      size="sm"
                      onClick={() => router.push("/subscriptions?confidence=low")}
                    >
                      Review uncertain channels
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* CTA */}
          <div className="border-t pt-6">
            <p className="text-sm text-muted-foreground mb-4 text-center">
              When you&apos;re ready, your full board is waiting.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard")}
                className="flex-1"
              >
                Skip to Dashboard
              </Button>
              <Button
                onClick={() => router.push("/subscriptions")}
                className="flex-1"
              >
                Go to Subscriptions
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sparkles,
  ArrowRight,
  AlertTriangle,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

interface ClassifiedChannel {
  channelId: string;
  name: string;
  thumbnailUrl: string | null;
  category: string;
  confidence: number;
}

interface ImportEvent {
  step: string;
  progress?: string;
  message: string;
  subscriptionCount?: number;
  deadChannelCount?: number;
  classifiedChannels?: ClassifiedChannel[];
  error?: string;
}

interface ProfileData {
  user: {
    archetype: string | null;
    profileSummary: string | null;
    dominantThemes: string[] | null;
    topCategories: string[] | null;
    subscriptionCount: number;
    deadChannelCount: number;
    diversityScore: number | null;
  };
  stats: {
    total: number;
    active: number;
    dead: number;
    reviewed: number;
  };
  subscriptionEras?: {
    period: string;
    name: string;
    channels: (string | { channelId?: string; title?: string })[];
    theme: string;
  }[];
}

interface InsightsData {
  deadChannels: { channelId: string; title: string; lastUploadAt: string | null }[];
  lowConfidence: { channelId: string; title: string; currentCategory: string; confidence: number }[];
  redundancies: { topic: string; channels: string[] }[];
  needsAttentionCount: number;
}

type Act = "permission" | "sort" | "mirror" | "timeline" | "reckoning" | "first-move" | "complete";

// ============================================================================
// Reckoning Questions
// ============================================================================

interface Question {
  id: string;
  question: string;
  getOptions: (data: ProfileData, insights: InsightsData) => string[];
  getAnswer: (data: ProfileData, insights: InsightsData) => string;
  getReveal: (data: ProfileData, insights: InsightsData, guess: string) => string;
}

const QUESTIONS: Question[] = [
  {
    id: "active",
    question: "How many of your channels are still actively posting?",
    getOptions: (data) => {
      const total = data.user.subscriptionCount;
      const active = total - data.user.deadChannelCount;
      // Generate options around the real answer
      const opts = [
        `~${Math.round(total * 0.9 / 10) * 10}`,
        `~${Math.round(total * 0.8 / 10) * 10}`,
        `~${Math.round(total * 0.65 / 10) * 10}`,
        `~${Math.round(total * 0.5 / 10) * 10}`,
      ];
      return opts;
    },
    getAnswer: (data) => {
      const active = data.user.subscriptionCount - data.user.deadChannelCount;
      return `${active} active, ${data.user.deadChannelCount} dead`;
    },
    getReveal: (data, _insights, guess) => {
      const dead = data.user.deadChannelCount;
      if (dead === 0) return "All your channels are still active. Clean subscription list.";
      return `That's ${dead} channel${dead !== 1 ? "s" : ""} you're subscribed to that haven't posted in over 6 months.`;
    },
  },
  {
    id: "top-category",
    question: "What's your #1 category by channel count?",
    getOptions: (data) => {
      const themes = data.user.dominantThemes || [];
      // Show top 4 themes shuffled
      return themes.slice(0, 4);
    },
    getAnswer: (data) => {
      return data.user.topCategories?.[0] || data.user.dominantThemes?.[0] || "Unknown";
    },
    getReveal: (data) => {
      const themes = data.user.dominantThemes || [];
      if (themes.length >= 2) {
        return `But ${themes[1]} is closer behind than you might think.`;
      }
      return "Your interests are more focused than most.";
    },
  },
  {
    id: "redundancy",
    question: "How many of your channels overlap on the same topic?",
    getOptions: () => ["0-5", "5-10", "10-20", "20+"],
    getAnswer: (_data, insights) => {
      const total = insights.redundancies.reduce((sum, r) => sum + r.channels.length, 0);
      return `${total} channels across ${insights.redundancies.length} clusters`;
    },
    getReveal: (_data, insights) => {
      if (insights.redundancies.length === 0) return "Your subscriptions are surprisingly diverse — minimal overlap.";
      const top = insights.redundancies[0];
      return `The biggest overlap: ${top.channels.length} channels covering "${top.topic}".`;
    },
  },
];

// ============================================================================
// Main Component
// ============================================================================

export default function WelcomeWizard() {
  const router = useRouter();
  const [act, setAct] = useState<Act>("permission");

  // Import state
  const [importProgress, setImportProgress] = useState(0);
  const [importMessage, setImportMessage] = useState("");
  const [sortedChannels, setSortedChannels] = useState<ClassifiedChannel[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});

  // Data state
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [insights, setInsights] = useState<InsightsData | null>(null);

  // Reckoning state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showReveal, setShowReveal] = useState(false);

  // First Move state
  const [weakChannels, setWeakChannels] = useState<InsightsData["deadChannels"]>([]);
  const [currentWeakIdx, setCurrentWeakIdx] = useState(0);
  const [triageActions, setTriageActions] = useState<Record<string, string>>({});

  // Timeline animation
  const [visibleEras, setVisibleEras] = useState(0);

  // ===== Import Pipeline =====
  const runImport = useCallback(async () => {
    setAct("sort");
    setImportMessage("Connecting to YouTube...");

    try {
      const res = await fetch("/api/import", { method: "POST" });

      if (!res.ok || !res.body) {
        setAct("permission");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const event: ImportEvent = JSON.parse(line.slice(6));
              setImportMessage(event.message);

              // Map steps to progress percentage
              const stepMap: Record<string, number> = {
                subscriptions: 15, metadata: 30, rss: 40,
                classify: 70, profile: 85, metrics: 95, complete: 100,
              };
              setImportProgress(stepMap[event.step] || 0);

              // Feed classified channels into the sorting UI
              if (event.step === "classify" && event.classifiedChannels) {
                setSortedChannels((prev) => [...prev, ...event.classifiedChannels!]);
                setCategoryCounts((prev) => {
                  const next = { ...prev };
                  for (const ch of event.classifiedChannels!) {
                    next[ch.category] = (next[ch.category] || 0) + 1;
                  }
                  return next;
                });
              }

              if (event.step === "complete") {
                await loadData();
                return;
              }

              if (event.step === "error") {
                setAct("permission");
                return;
              }
            } catch { /* ignore partial chunks */ }
          }
        }
      }
    } catch {
      setAct("permission");
    }
  }, []);

  const loadData = useCallback(async () => {
    // Tier 1: once import completes, head straight to the dashboard.
    // Mirror/Timeline/Reckoning/First-Move acts stay in the codebase but
    // are skipped for now — dashboard is where classifications land.
    router.push("/dashboard");
  }, [router]);

  // Timeline era animation
  useEffect(() => {
    if (act !== "timeline") return;
    const eras = profile?.subscriptionEras || [];
    if (eras.length === 0) {
      // Skip timeline if no eras
      setTimeout(() => setAct("reckoning"), 500);
      return;
    }
    const interval = setInterval(() => {
      setVisibleEras((prev) => {
        if (prev >= eras.length) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 800);
    return () => clearInterval(interval);
  }, [act, profile]);

  // ===== ACT 0: THE PERMISSION =====
  if (act === "permission") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-lg w-full">
          <CardContent className="pt-10 pb-10 text-center">
            <div className="flex items-center justify-center gap-2 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-lg">
                P
              </div>
              <span className="text-2xl font-bold tracking-tight">Pulse</span>
            </div>

            <h2 className="text-xl font-semibold mb-2">Welcome to Pulse</h2>
            <p className="text-muted-foreground mb-8">
              Here&apos;s what happens next:
            </p>

            <div className="text-left space-y-4 mb-10 max-w-sm mx-auto">
              <div className="flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">1</div>
                <p className="text-sm text-muted-foreground">We pull your subscription list from YouTube</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">2</div>
                <p className="text-sm text-muted-foreground">AI categorizes every channel into topics</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">3</div>
                <p className="text-sm text-muted-foreground">You see your subscription identity for the first time</p>
              </div>
            </div>

            <Button size="lg" className="gap-2 text-base px-8" onClick={runImport}>
              Extract My Subscriptions
              <ArrowRight className="h-4 w-4" />
            </Button>

            <p className="text-xs text-muted-foreground mt-4">
              Takes about 30 seconds. Read-only access — we never modify your account.
            </p>

            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-xs text-muted-foreground hover:text-foreground mt-6 underline underline-offset-2"
            >
              Sign out
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ===== ACT 1: THE SORT =====
  if (act === "sort") {
    const topCategories = Object.entries(categoryCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8);

    const recentChannels = sortedChannels.slice(-6);

    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-2xl w-full space-y-8">
          <div className="text-center">
            <Sparkles className="h-8 w-8 text-primary mx-auto mb-3 animate-pulse" />
            <h2 className="text-2xl font-bold mb-1">Reading your subscriptions</h2>
            <p className="text-muted-foreground">{importMessage}</p>
          </div>

          <Progress value={importProgress} className="h-2" />

          {/* Live category buckets */}
          {topCategories.length > 0 && (
            <div className="space-y-3">
              {topCategories.map(([category, count]) => (
                <div key={category} className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground w-48 truncate text-right">{category}</span>
                  <div className="flex-1 bg-muted rounded-full h-6 overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                      style={{ width: `${Math.min((count / (sortedChannels.length || 1)) * 100, 100)}%`, minWidth: "2rem" }}
                    >
                      <span className="text-xs font-medium text-primary-foreground">{count}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Recently sorted channels */}
          {recentChannels.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-center">
              {recentChannels.map((ch) => (
                <div
                  key={ch.channelId}
                  className="flex items-center gap-2 bg-card border rounded-full px-3 py-1.5 text-sm animate-in fade-in slide-in-from-left-2 duration-300"
                >
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={ch.thumbnailUrl || ""} />
                    <AvatarFallback className="text-[10px]">{ch.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="truncate max-w-[120px]">{ch.name}</span>
                  <span className="text-xs text-muted-foreground">→</span>
                  <span className="text-xs text-primary truncate max-w-[100px]">{ch.category}</span>
                </div>
              ))}
            </div>
          )}

          {sortedChannels.length === 0 && importProgress < 50 && (
            <div className="flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      </div>
    );
  }

  // ===== ACT 2: THE MIRROR =====
  if (act === "mirror") {
    const user = profile?.user;
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-lg w-full">
          <CardContent className="pt-10 pb-10 text-center">
            <div className="text-6xl font-bold text-primary mb-2 animate-in fade-in zoom-in duration-700">
              {user?.subscriptionCount || 0}
            </div>
            <p className="text-lg text-muted-foreground mb-8">channels in your subscriptions</p>

            {/* DNA placeholder - category badges */}
            <div className="flex flex-wrap gap-2 justify-center mb-8">
              {user?.dominantThemes?.slice(0, 5).map((theme) => (
                <Badge key={theme} variant="secondary" className="text-sm py-1 px-3">
                  {theme}
                </Badge>
              ))}
            </div>

            {/* Archetype */}
            {user?.archetype && (
              <div className="mb-6 animate-in fade-in duration-1000 delay-300">
                <p className="text-sm text-muted-foreground mb-1">Your subscription identity:</p>
                <p className="text-2xl font-bold tracking-tight">&ldquo;{user.archetype}&rdquo;</p>
              </div>
            )}

            {/* Profile Summary */}
            {user?.profileSummary && (
              <div className="bg-muted/50 rounded-lg p-4 mb-8 text-left animate-in fade-in duration-1000 delay-500">
                <p className="text-sm text-muted-foreground italic">{user.profileSummary}</p>
              </div>
            )}

            {user?.diversityScore != null && (
              <p className="text-sm text-muted-foreground mb-8">
                Diversity score: <span className="font-semibold text-foreground">{(user.diversityScore * 100).toFixed(0)}%</span>
              </p>
            )}

            <Button size="lg" onClick={() => setAct("timeline")} className="gap-2">
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ===== ACT 3: THE TIMELINE =====
  if (act === "timeline") {
    const eras = profile?.subscriptionEras || [];

    if (eras.length === 0) {
      // No eras data — skip to reckoning
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-lg w-full">
          <CardContent className="pt-10 pb-10">
            <h2 className="text-xl font-bold text-center mb-8">Your subscription story</h2>

            <div className="relative pl-8 space-y-6">
              {/* Timeline line */}
              <div className="absolute left-3 top-2 bottom-2 w-px bg-border" />

              {eras.slice(0, visibleEras).map((era, i) => (
                <div
                  key={i}
                  className="relative animate-in fade-in slide-in-from-bottom-2 duration-500"
                >
                  {/* Dot */}
                  <div className="absolute -left-5 top-1 h-3 w-3 rounded-full bg-primary ring-4 ring-background" />

                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-medium">{era.period}</p>
                    <p className="font-semibold">{era.name}</p>
                    <p className="text-sm text-muted-foreground">{era.theme}</p>
                    {era.channels.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {era.channels.slice(0, 4).map((ch, ci) => {
                          const label = typeof ch === "string" ? ch : (ch.title || ch.channelId || "Unknown");
                          return (
                            <Badge key={ci} variant="outline" className="text-xs font-normal">{label}</Badge>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {visibleEras >= eras.length && (
              <div className="text-center mt-8 animate-in fade-in duration-500">
                <Button size="lg" onClick={() => setAct("reckoning")} className="gap-2">
                  Continue <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ===== ACT 4: THE RECKONING =====
  if (act === "reckoning") {
    if (!profile || !insights) {
      setAct("first-move");
      return null;
    }

    const q = QUESTIONS[currentQuestion];
    if (!q) {
      setAct("first-move");
      return null;
    }

    const options = q.getOptions(profile, insights);
    const answer = q.getAnswer(profile, insights);
    const reveal = selectedAnswer ? q.getReveal(profile, insights, selectedAnswer) : "";

    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-lg w-full">
          <CardContent className="pt-10 pb-10 text-center">
            <p className="text-xs text-muted-foreground mb-2">
              Question {currentQuestion + 1} of {QUESTIONS.length}
            </p>
            <h2 className="text-xl font-semibold mb-8">{q.question}</h2>

            {!showReveal ? (
              <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
                {options.map((opt) => (
                  <Button
                    key={opt}
                    variant="outline"
                    className="h-auto py-3 text-sm"
                    onClick={() => {
                      setSelectedAnswer(opt);
                      setShowReveal(true);
                    }}
                  >
                    {opt}
                  </Button>
                ))}
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in duration-500">
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-1">You guessed: <span className="font-medium text-foreground">{selectedAnswer}</span></p>
                  <p className="text-lg font-bold text-primary">{answer}</p>
                </div>
                <p className="text-sm text-muted-foreground">{reveal}</p>

                <Button
                  size="lg"
                  className="gap-2 mt-4"
                  onClick={() => {
                    if (currentQuestion < QUESTIONS.length - 1) {
                      setCurrentQuestion((prev) => prev + 1);
                      setSelectedAnswer(null);
                      setShowReveal(false);
                    } else {
                      setAct("first-move");
                    }
                  }}
                >
                  {currentQuestion < QUESTIONS.length - 1 ? "Next question" : "Continue"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ===== ACT 5: THE FIRST MOVE =====
  if (act === "first-move") {
    if (weakChannels.length === 0 || currentWeakIdx >= weakChannels.length) {
      // No weak channels or done triaging — go to complete
      if (act === "first-move") setAct("complete");
      return null;
    }

    const channel = weakChannels[currentWeakIdx];
    const actioned = triageActions[channel.channelId];

    const handleTriage = async (channelId: string, status: string) => {
      setTriageActions((prev) => ({ ...prev, [channelId]: status }));

      try {
        await fetch(`/api/subscriptions/${channelId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
      } catch { /* best effort */ }

      // Auto-advance after a brief pause
      setTimeout(() => {
        if (currentWeakIdx < weakChannels.length - 1) {
          setCurrentWeakIdx((prev) => prev + 1);
        } else {
          setAct("complete");
        }
      }, 400);
    };

    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-lg w-full">
          <CardContent className="pt-10 pb-10 text-center">
            <p className="text-xs text-muted-foreground mb-2">
              Quick cleanup: {currentWeakIdx + 1} of {weakChannels.length}
            </p>
            <h2 className="text-lg font-semibold mb-6">
              Channels that might not need to be here
            </h2>

            <div className="bg-muted/50 rounded-xl p-6 mb-6 animate-in fade-in slide-in-from-right-2 duration-300">
              <Avatar className="h-16 w-16 mx-auto mb-3">
                <AvatarFallback className="text-xl">{channel.title.charAt(0)}</AvatarFallback>
              </Avatar>
              <h3 className="text-lg font-bold">{channel.title}</h3>
              {channel.lastUploadAt && (
                <p className="text-sm text-muted-foreground mt-1">
                  Last upload: {new Date(channel.lastUploadAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                </p>
              )}
              {!channel.lastUploadAt && (
                <p className="text-sm text-amber-500 mt-1">Low confidence classification</p>
              )}
            </div>

            {!actioned ? (
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => handleTriage(channel.channelId, "active")} className="flex-1 max-w-[130px]">
                  Keep Active
                </Button>
                <Button variant="secondary" onClick={() => handleTriage(channel.channelId, "muted")} className="flex-1 max-w-[130px]">
                  Mute
                </Button>
                <Button variant="destructive" onClick={() => handleTriage(channel.channelId, "archived")} className="flex-1 max-w-[130px]">
                  Archive
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm capitalize">{actioned}</span>
              </div>
            )}

            <div className="mt-6">
              <Progress value={((currentWeakIdx + 1) / weakChannels.length) * 100} className="h-1" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ===== COMPLETION SCREEN =====
  const user = profile?.user;
  const archivedCount = Object.values(triageActions).filter((a) => a === "archived").length;
  const mutedCount = Object.values(triageActions).filter((a) => a === "muted").length;

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="max-w-lg w-full">
        <CardContent className="pt-10 pb-10 text-center">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">You&apos;re all set</h2>

          <div className="grid grid-cols-3 gap-4 my-8">
            <div>
              <div className="text-2xl font-bold text-primary">{user?.subscriptionCount || 0}</div>
              <p className="text-xs text-muted-foreground">organized</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-500">{user?.deadChannelCount || 0}</div>
              <p className="text-xs text-muted-foreground">dead flagged</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-500">{archivedCount + mutedCount}</div>
              <p className="text-xs text-muted-foreground">cleaned up</p>
            </div>
          </div>

          {user?.archetype && (
            <div className="bg-muted/50 rounded-lg p-4 mb-8">
              <p className="text-sm text-muted-foreground mb-1">Your subscription identity:</p>
              <p className="text-xl font-bold">&ldquo;{user.archetype}&rdquo;</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" onClick={() => router.push("/triage")} className="flex-1">
              Full Triage ({user?.subscriptionCount || 0} channels)
            </Button>
            <Button onClick={() => router.push("/dashboard")} className="flex-1 gap-2">
              Go to Dashboard <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

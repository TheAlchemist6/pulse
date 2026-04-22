"use client";

import { signIn } from "next-auth/react";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  LayoutGrid,
  Search,
  Zap,
  RefreshCw,
  Fingerprint,
  Clock,
  MessageSquare,
  Target,
  ArrowRight,
  Play,
  Moon,
  Sun,
  Shield,
} from "lucide-react";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="currentColor"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="currentColor"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="currentColor"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="currentColor"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function CTAButton({ variant = "default", className = "" }: { variant?: "default" | "outline"; className?: string }) {
  return (
    <Button
      onClick={() => signIn("google", { callbackUrl: "/welcome" })}
      size="lg"
      variant={variant}
      className={`gap-2 ${className}`}
    >
      <GoogleIcon className="h-5 w-5" />
      Sign in with YouTube
      <ArrowRight className="h-4 w-4" />
    </Button>
  );
}

export function LandingPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
              P
            </div>
            <span className="text-xl font-semibold tracking-tight">Pulse</span>
          </div>
          <div className="flex items-center gap-2">
            {mounted && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            )}
            <CTAButton variant="outline" />
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-6">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm text-muted-foreground">
            <Play className="h-4 w-4" />
            For YouTube viewers with 100+ subscriptions
          </div>

          <h1 className="text-5xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
            You don&apos;t know what
            <br />
            <span className="text-primary">you&apos;re subscribed to</span>
          </h1>

          <p className="mt-6 text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Pulse connects to your YouTube account, pulls every subscription,
            and uses AI to categorize, audit, and organize them — so you can
            take back control of your attention.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <CTAButton className="text-base px-8 py-6" />
            <p className="text-sm text-muted-foreground">
              Read-only access. We never post or modify anything.
            </p>
          </div>
        </div>
      </section>

      {/* The Problem */}
      <section className="border-t bg-muted/50 py-20 px-6">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-3xl font-bold tracking-tight">
            The subscription pile-up is real
          </h2>
          <p className="mt-4 text-center text-lg text-muted-foreground max-w-2xl mx-auto">
            You subscribed to channels over years of impulse clicks.
            Now your feed is a firehose you didn&apos;t consciously choose.
          </p>

          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            <div className="rounded-xl border bg-card p-6">
              <div className="text-4xl font-bold text-primary">247</div>
              <p className="mt-2 text-sm text-muted-foreground">
                Average subscriptions for a power user
              </p>
            </div>
            <div className="rounded-xl border bg-card p-6">
              <div className="text-4xl font-bold text-primary">63%</div>
              <p className="mt-2 text-sm text-muted-foreground">
                Of channels you&apos;ve stopped watching but never unsubscribed from
              </p>
            </div>
            <div className="rounded-xl border bg-card p-6">
              <div className="text-4xl font-bold text-primary">0</div>
              <p className="mt-2 text-sm text-muted-foreground">
                Tools that show you your subscription identity
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Four Verbs */}
      <section className="py-20 px-6">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-3xl font-bold tracking-tight">
            Four verbs. One clean workflow.
          </h2>
          <p className="mt-4 text-center text-lg text-muted-foreground">
            Sign in once. Pulse handles the rest in under 30 seconds.
          </p>

          <div className="mt-14 grid gap-8 sm:grid-cols-2">
            <div className="flex gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <LayoutGrid className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Organize</h3>
                <p className="mt-1 text-muted-foreground">
                  AI categorizes every subscription into 45+ categories.
                  Channels land in the right bucket automatically — you just confirm or adjust.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Search className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Audit</h3>
                <p className="mt-1 text-muted-foreground">
                  See your subscription identity — dominant themes, dead channels,
                  redundancies, diversity score. A mirror for your YouTube diet.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-600">
                <Zap className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Act</h3>
                <p className="mt-1 text-muted-foreground">
                  Drag to rank. Mute the noise. Archive the dead weight.
                  Kanban board or card-by-card triage — your call.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                <RefreshCw className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Monitor</h3>
                <p className="mt-1 text-muted-foreground">
                  Re-sync anytime. See what changed — new subscriptions
                  categorized automatically, unsubscribes flagged. Your landscape stays current.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Unique Features */}
      <section className="border-t bg-muted/50 py-20 px-6">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-3xl font-bold tracking-tight">
            Things no other tool does
          </h2>

          <div className="mt-14 grid gap-8 sm:grid-cols-3">
            <div className="rounded-xl border bg-card p-6">
              <Fingerprint className="h-8 w-8 text-primary" />
              <h3 className="mt-4 text-lg font-semibold">Subscription DNA</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                A unique visual fingerprint of your subscription profile.
                Shareable. No two look the same.
              </p>
            </div>

            <div className="rounded-xl border bg-card p-6">
              <Clock className="h-8 w-8 text-primary" />
              <h3 className="mt-4 text-lg font-semibold">Subscription Timeline</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                See when you subscribed to every channel. AI names your eras:
                &ldquo;Your 2020 learn-to-code phase.&rdquo;
              </p>
            </div>

            <div className="rounded-xl border bg-card p-6">
              <MessageSquare className="h-8 w-8 text-primary" />
              <h3 className="mt-4 text-lg font-semibold">Guided Audit</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                After import, Pulse walks you through the highlights — dead channels,
                duplicates, uncertain categories. Not a dashboard dump.
              </p>
            </div>

            <div className="rounded-xl border bg-card p-6">
              <Target className="h-8 w-8 text-primary" />
              <h3 className="mt-4 text-lg font-semibold">Inbox Zero for Subs</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Review every subscription one by one. Active, Mute, or Archive.
                Progress bar tracks your way to 100% reviewed.
              </p>
            </div>

            <div className="rounded-xl border bg-card p-6">
              <LayoutGrid className="h-8 w-8 text-primary" />
              <h3 className="mt-4 text-lg font-semibold">Kanban Board</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Categories as columns. Drag channels between them.
                Rank by priority within each category. Full control.
              </p>
            </div>

            <div className="rounded-xl border bg-card p-6">
              <Search className="h-8 w-8 text-primary" />
              <h3 className="mt-4 text-lg font-semibold">AI Profile Summary</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                &ldquo;You&apos;re deep in Tech and Business with a growing Creator Economy
                interest. 12 dead channels. 6 React tutorial duplicates.&rdquo;
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-3xl font-bold tracking-tight">
            30 seconds from sign-in to insight
          </h2>

          <div className="mt-14 space-y-8">
            <div className="flex items-start gap-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                1
              </div>
              <div>
                <h3 className="text-lg font-semibold">Sign in with YouTube</h3>
                <p className="text-muted-foreground">
                  One click. Read-only access. We see your subscriptions — nothing else.
                  No watch history, no search history, no private data.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                2
              </div>
              <div>
                <h3 className="text-lg font-semibold">Pulse imports and categorizes</h3>
                <p className="text-muted-foreground">
                  We pull every subscription, fetch channel metadata, and run a 2-pass
                  AI analysis. Each channel gets a category, confidence score, and reasoning.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                3
              </div>
              <div>
                <h3 className="text-lg font-semibold">See who you are as a subscriber</h3>
                <p className="text-muted-foreground">
                  Your profile summary, dominant themes, diversity score, subscription timeline,
                  and DNA visualization — all generated automatically.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                4
              </div>
              <div>
                <h3 className="text-lg font-semibold">Take control</h3>
                <p className="text-muted-foreground">
                  Triage your subscriptions. Mute the noise. Archive the dead weight.
                  Rank what matters. Your subscription landscape, consciously curated.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="border-t bg-muted/50 py-20 px-6">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-3xl font-bold tracking-tight">
            Your data stays yours
          </h2>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 max-w-2xl mx-auto">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Read-only access</p>
                <p className="text-sm text-muted-foreground">
                  We never post, subscribe, unsubscribe, or modify anything on your YouTube account.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">No watch history</p>
                <p className="text-sm text-muted-foreground">
                  We can&apos;t see what you watch. Only what you&apos;re subscribed to.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Delete anytime</p>
                <p className="text-sm text-muted-foreground">
                  One click removes all your data and revokes YouTube access. No questions asked.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">No identity sent to AI</p>
                <p className="text-sm text-muted-foreground">
                  Channel metadata goes to AI for categorization. Your name, email, and tokens never do.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-4xl font-bold tracking-tight">
            Ready to see what you&apos;re really subscribed to?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            One click. 30 seconds. Your subscription landscape, organized.
          </p>
          <div className="mt-8">
            <CTAButton className="text-base px-8 py-6" />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-primary-foreground font-bold text-xs">
              P
            </div>
            <span>Pulse</span>
          </div>
          <div className="flex gap-6">
            <a href="/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </a>
            <a href="/terms" className="hover:text-foreground transition-colors">
              Terms
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

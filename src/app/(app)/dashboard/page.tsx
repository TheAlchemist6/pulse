import { auth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DiversityGauge } from "@/components/dashboard/diversity-gauge";
import { SubscriptionDna } from "@/components/dashboard/subscription-dna";
import { StatsGrid } from "@/components/dashboard/stats-grid";
import { NeedsAttention } from "@/components/dashboard/needs-attention";

export default async function DashboardPage() {
  const session = await auth();
  const user = session?.user;

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
        </p>
      </div>

      <StatsGrid userId={user?.id} />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Subscription DNA</CardTitle>
            <CardDescription>Your category distribution at a glance</CardDescription>
          </CardHeader>
          <CardContent>
            <SubscriptionDna userId={user?.id} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Diversity Score</CardTitle>
            <CardDescription>How varied is your subscription landscape?</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <DiversityGauge userId={user?.id} />
          </CardContent>
        </Card>
      </div>

      <NeedsAttention userId={user?.id} />
    </div>
  );
}

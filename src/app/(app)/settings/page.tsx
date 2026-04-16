import { auth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { SyncButton } from "@/components/settings/sync-button";
import { SignOutButton } from "@/components/settings/sign-out-button";

export default async function SettingsPage() {
  const session = await auth();
  const user = session?.user;

  return (
    <div className="container mx-auto p-6 space-y-8 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account and preferences
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Your connected account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user?.avatar_url || ""} alt={user?.name || "User"} />
              <AvatarFallback>{user?.name?.charAt(0) || "U"}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{user?.name}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <Separator />
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">YouTube Channel</span>
              <span>{user?.youtube_channel_id || "Not connected"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subscriptions</span>
              <span>{user?.subscription_count || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Synced</span>
              <span>
                {user?.last_synced_at
                  ? new Date(user.last_synced_at).toLocaleDateString()
                  : "Never"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sync</CardTitle>
          <CardDescription>Import new subscriptions or sync existing ones</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SyncButton />
          <p className="text-xs text-muted-foreground">
            Re-syncing will detect new channels you have subscribed to on YouTube
            and categorize them automatically.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Export</CardTitle>
          <CardDescription>Download your subscription data</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Button variant="outline">Export as CSV</Button>
          <Button variant="outline">Export as JSON</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Danger Zone</CardTitle>
          <CardDescription>Irreversible actions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Sign Out</p>
              <p className="text-sm text-muted-foreground">
                Sign out of your Pulse account
              </p>
            </div>
            <SignOutButton />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-destructive">Delete Account</p>
              <p className="text-sm text-muted-foreground">
                Permanently delete your account and all data
              </p>
            </div>
            <Button variant="destructive">Delete Account</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

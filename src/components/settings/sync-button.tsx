"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export function SyncButton() {
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const handleSync = async () => {
    setSyncing(true);
    // TODO: Call sync API
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setSyncing(false);
    setLastSync(new Date().toISOString());
  };

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={handleSync} disabled={syncing}>
        <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
        {syncing ? "Syncing..." : "Sync Now"}
      </Button>
      {lastSync && (
        <p className="text-xs text-muted-foreground">
          Last synced: {new Date(lastSync).toLocaleString()}
        </p>
      )}
    </div>
  );
}

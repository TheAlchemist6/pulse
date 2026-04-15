"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface CategoryCount {
  name: string;
  count: number;
}

interface CategoryBreakdownProps {
  userId?: string;
}

export function CategoryBreakdown({ userId }: CategoryBreakdownProps) {
  const [categories, setCategories] = useState<CategoryCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCategories() {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const data = await res.json();
          setCategories(data.user?.topCategories || []);
        }
      } catch (error) {
        console.error("Failed to fetch category breakdown:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchCategories();
  }, [userId]);

  const maxCount = Math.max(...categories.map((c) => c.count), 1);
  const totalChannels = categories.reduce((sum, c) => sum + c.count, 0);

  // Color palette for categories
  const colors = [
    "bg-blue-500",
    "bg-green-500",
    "bg-amber-500",
    "bg-purple-500",
    "bg-rose-500",
    "bg-cyan-500",
    "bg-indigo-500",
    "bg-orange-500",
    "bg-teal-500",
    "bg-pink-500",
  ];

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Category Breakdown</CardTitle>
          <CardDescription>Distribution of your subscriptions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (categories.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Category Breakdown</CardTitle>
          <CardDescription>Distribution of your subscriptions</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No category data available yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Category Breakdown</CardTitle>
        <CardDescription>Distribution of your subscriptions across categories</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Bar chart view */}
        <div className="space-y-3">
          {categories.slice(0, 10).map((category, index) => {
            const percentage = totalChannels > 0 ? (category.count / totalChannels) * 100 : 0;
            const barWidth = (category.count / maxCount) * 100;
            const isHovered = hoveredCategory === category.name;

            return (
              <div
                key={category.name}
                className="relative"
                onMouseEnter={() => setHoveredCategory(category.name)}
                onMouseLeave={() => setHoveredCategory(null)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium truncate pr-2">{category.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {category.count} ({percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500 ease-out",
                      colors[index % colors.length],
                      isHovered && "opacity-90"
                    )}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary stats */}
        <div className="mt-6 pt-4 border-t">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Categories</span>
            <span className="font-medium">{categories.length}</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-muted-foreground">Total Channels</span>
            <span className="font-medium">{totalChannels}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

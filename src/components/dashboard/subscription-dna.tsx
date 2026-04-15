"use client";

import { useEffect, useRef } from "react";

interface SubscriptionDnaProps {
  userId?: string;
}

interface CategoryData {
  name: string;
  count: number;
  percentage: number;
}

export function SubscriptionDna({ userId }: SubscriptionDnaProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = 300;
    const height = 300;
    canvas.width = width;
    canvas.height = height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = 120;
    const minRadius = 40;

    // Sample data - in production this would come from API
    const categories: CategoryData[] = [
      { name: "Tech", count: 45, percentage: 0.25 },
      { name: "Business", count: 30, percentage: 0.17 },
      { name: "Science", count: 25, percentage: 0.14 },
      { name: "Gaming", count: 35, percentage: 0.19 },
      { name: "Entertainment", count: 20, percentage: 0.11 },
      { name: "Sports", count: 15, percentage: 0.08 },
      { name: "News", count: 10, percentage: 0.06 },
    ];

    const colors = [
      "#3b82f6", // blue
      "#22c55e", // green
      "#f59e0b", // amber
      "#ef4444", // red
      "#8b5cf6", // purple
      "#ec4899", // pink
      "#06b6d4", // cyan
    ];

    // Draw radial bars
    categories.forEach((category, index) => {
      const angle = (index / categories.length) * Math.PI * 2 - Math.PI / 2;
      const barLength = minRadius + (category.percentage * (maxRadius - minRadius));

      const x1 = centerX + Math.cos(angle) * minRadius;
      const y1 = centerY + Math.sin(angle) * minRadius;
      const x2 = centerX + Math.cos(angle) * barLength;
      const y2 = centerY + Math.sin(angle) * barLength;

      // Draw bar
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = colors[index % colors.length];
      ctx.lineWidth = 8;
      ctx.lineCap = "round";
      ctx.stroke();

      // Draw label
      const labelRadius = barLength + 15;
      const labelX = centerX + Math.cos(angle) * labelRadius;
      const labelY = centerY + Math.sin(angle) * labelRadius;

      ctx.fillStyle = "#64748b";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(category.name, labelX, labelY);
    });

    // Draw center circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, minRadius - 5, 0, Math.PI * 2);
    ctx.fillStyle = "#f8fafc";
    ctx.fill();
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Center text
    ctx.fillStyle = "#1e293b";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("DNA", centerX, centerY);
  }, [userId]);

  return (
    <div className="flex flex-col items-center">
      <canvas ref={canvasRef} className="mx-auto" />
      <p className="text-xs text-muted-foreground mt-4 text-center">
        Your subscription DNA shows category distribution
      </p>
    </div>
  );
}

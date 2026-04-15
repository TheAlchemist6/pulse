"use client";

import { useEffect, useRef } from "react";

interface DiversityGaugeProps {
  userId?: string;
  score?: number | null;
}

export function DiversityGauge({ userId, score }: DiversityGaugeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = 200;
    const height = 200;
    canvas.width = width;
    canvas.height = height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw arc background
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = 70;
    const startAngle = Math.PI * 0.75;
    const endAngle = Math.PI * 2.25;

    // Background arc
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 12;
    ctx.lineCap = "round";
    ctx.stroke();

    // Score arc (0-1 mapped to arc)
    const displayScore = score ?? 0;
    const scoreAngle = startAngle + (displayScore * (endAngle - startAngle));

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, scoreAngle);

    // Color based on score
    let color = "#ef4444"; // red for low
    if (displayScore > 0.5) color = "#f59e0b"; // amber for medium
    if (displayScore > 0.7) color = "#22c55e"; // green for high

    ctx.strokeStyle = color;
    ctx.lineWidth = 12;
    ctx.lineCap = "round";
    ctx.stroke();

    // Draw score text
    ctx.fillStyle = "#1e293b";
    ctx.font = "bold 36px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(displayScore.toFixed(2), centerX, centerY - 10);

    ctx.fillStyle = "#64748b";
    ctx.font = "14px sans-serif";
    ctx.fillText("diversity", centerX, centerY + 20);
  }, [score]);

  return (
    <div className="relative">
      <canvas ref={canvasRef} className="mx-auto" />
      <div className="absolute bottom-0 left-0 right-0 text-center text-xs text-muted-foreground mt-2">
        Higher = more diverse subscription mix
      </div>
    </div>
  );
}

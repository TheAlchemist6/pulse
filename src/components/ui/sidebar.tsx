"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const SidebarProvider = ({ children }: { children: React.ReactNode }) => children;

const SidebarInset = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("min-h-screen flex-1 bg-background", className)}
    {...props}
  />
));
SidebarInset.displayName = "SidebarInset";

export {
  SidebarProvider,
  SidebarInset,
};

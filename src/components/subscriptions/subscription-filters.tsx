"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SubscriptionFiltersProps {
  filters: {
    status: "all" | "active" | "muted" | "archived";
    category: string;
    confidence: "all" | "high" | "medium" | "low";
    search: string;
  };
  onFiltersChange: (filters: SubscriptionFiltersProps["filters"]) => void;
}

export function SubscriptionFilters({ filters, onFiltersChange }: SubscriptionFiltersProps) {
  return (
    <div className="flex flex-wrap gap-4">
      <div className="flex-1 min-w-[200px]">
        <Input
          placeholder="Search channels..."
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
        />
      </div>

      <div className="w-[150px]">
        <Select
          value={filters.status}
          onValueChange={(value) => onFiltersChange({ ...filters, status: value as typeof filters.status })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="muted">Muted</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="w-[150px]">
        <Select
          value={filters.confidence}
          onValueChange={(value) => onFiltersChange({ ...filters, confidence: value as typeof filters.confidence })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Confidence" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Confidence</SelectItem>
            <SelectItem value="high">High (4-5)</SelectItem>
            <SelectItem value="medium">Medium (2-3)</SelectItem>
            <SelectItem value="low">Low (1)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="w-[200px]">
        <Select
          value={filters.category}
          onValueChange={(value) => onFiltersChange({ ...filters, category: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="technology-software">Technology & Software</SelectItem>
            <SelectItem value="business-finance">Business & Finance</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

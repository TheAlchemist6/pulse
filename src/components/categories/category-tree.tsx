"use client";

import { useState } from "react";
import { SortableTree } from "./sortable-tree";
import type { Category } from "@/lib/types";

interface CategoryTreeProps {
  onEdit: (category: Category) => void;
}

export function CategoryTree({ onEdit }: CategoryTreeProps) {
  const [categories, setCategories] = useState<Category[]>([]);

  // TODO: Fetch categories from API

  return (
    <div className="rounded-lg border bg-card">
      <SortableTree categories={categories} onEdit={onEdit} />
    </div>
  );
}

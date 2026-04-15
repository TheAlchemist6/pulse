"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown, Folder, FolderOpen, MoreHorizontal, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";

interface SortableTreeProps {
  categories: Category[];
  onEdit: (category: Category) => void;
}

interface TreeItemProps {
  category: Category;
  onEdit: (category: Category) => void;
  level: number;
}

function TreeItem({ category, onEdit, level }: TreeItemProps) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = category.children && category.children.length > 0;

  return (
    <div>
      <div
        className={cn(
          "flex items-center justify-between py-2 px-3 hover:bg-muted/50 rounded-md group",
          level > 0 && "ml-6"
        )}
        style={{ paddingLeft: `${level * 24 + 12}px` }}
      >
        <div className="flex items-center gap-2">
          {hasChildren ? (
            <button
              onClick={() => setExpanded(!expanded)}
              className="h-5 w-5 flex items-center justify-center"
            >
              {expanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          ) : (
            <span className="h-5 w-5" />
          )}
          {expanded && hasChildren ? (
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Folder className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="font-medium">{category.name}</span>
          <span className="text-sm text-muted-foreground">
            ({category.channel_count})
          </span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {level === 0 && (
              <DropdownMenuItem onClick={() => {/* TODO: Add child */}}>
                <Plus className="mr-2 h-4 w-4" />
                Add Subcategory
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onEdit(category)}>
              <Pencil className="mr-2 h-4 w-4" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {hasChildren && expanded && (
        <div>
          {category.children?.map((child) => (
            <TreeItem
              key={child.id}
              category={child}
              onEdit={onEdit}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function SortableTree({ categories, onEdit }: SortableTreeProps) {
  if (categories.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        No categories yet. Create your first category to get started.
      </div>
    );
  }

  return (
    <div className="p-2">
      {categories.map((category) => (
        <TreeItem
          key={category.id}
          category={category}
          onEdit={onEdit}
          level={0}
        />
      ))}
    </div>
  );
}

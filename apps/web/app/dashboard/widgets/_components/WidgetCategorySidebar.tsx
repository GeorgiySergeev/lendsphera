"use client";

import { Download, LayoutGrid } from "lucide-react";

import {
  Badge,
  Button,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  cn
} from "@workspace/ui";
import type { WidgetLibraryListItem } from "@workspace/types";

export type WidgetCategoryNavItem = {
  id: string;
  name: string;
  count: number;
};

type WidgetCategorySidebarProps = {
  categories: WidgetCategoryNavItem[];
  widgets: WidgetLibraryListItem[];
  selectedCategory: string | null;
  selectedTags: string[];
  onCategoryChange: (id: string | null) => void;
  onTagToggle: (tag: string) => void;
};

function WidgetCategorySidebar({
  categories,
  widgets,
  selectedCategory,
  selectedTags,
  onCategoryChange,
  onTagToggle
}: WidgetCategorySidebarProps) {
  const popularTags = getPopularTags(widgets);

  return (
    <aside className="sticky top-[120px] hidden h-[calc(100vh-120px)] overflow-y-auto border-r bg-background lg:block">
      <div className="flex min-h-full flex-col gap-5 p-4">
        <button
          type="button"
          onClick={() => onCategoryChange(null)}
          className={cn(
            "flex w-full items-center justify-between rounded-md border-l-2 border-transparent px-3 py-2 text-sm transition-colors hover:bg-muted",
            selectedCategory === null &&
              "border-primary bg-primary/10 font-semibold text-primary"
          )}
        >
          <span>All</span>
          <Badge
            variant="outline"
            className={cn(
              "shrink-0 border-border/80 bg-transparent px-1.5 py-0 font-normal tabular-nums text-muted-foreground",
              selectedCategory === null && "border-primary/35 text-primary"
            )}
          >
            {widgets.length}
          </Badge>
        </button>

        <div>
          <p className="px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Categories
          </p>
          <div className="mt-2 space-y-1">
            {categories.map((category) => {
              const active = selectedCategory === category.id;

              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => onCategoryChange(category.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md border-l-2 border-transparent px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
                    active && "border-primary bg-primary/10 font-semibold text-primary"
                  )}
                >
                  <LayoutGrid
                    className="h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate">{category.name}</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "shrink-0 border-border/80 bg-transparent px-1.5 py-0 font-normal tabular-nums text-muted-foreground",
                      active && "border-primary/35 text-primary"
                    )}
                  >
                    {category.count}
                  </Badge>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Popular tags
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {popularTags.map(({ tag, count }) => {
              const selected = selectedTags.includes(tag);

              return (
                <button key={tag} type="button" onClick={() => onTagToggle(tag)}>
                  <Badge variant={selected ? "default" : "outline"}>
                    {tag}
                    <span className="ml-1 opacity-60">{count}</span>
                  </Badge>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-auto border-t pt-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start gap-2"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                Import widgets
              </Button>
            </TooltipTrigger>
            <TooltipContent>Coming soon</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </aside>
  );
}

function getPopularTags(items: WidgetLibraryListItem[]) {
  const counts = new Map<string, number>();

  for (const w of items) {
    for (const tag of w.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 15)
    .map(([tag, count]) => ({ tag, count }));
}

export { WidgetCategorySidebar };

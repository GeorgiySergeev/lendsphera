"use client";

import { Grid2X2, List, Search, X } from "lucide-react";
import * as React from "react";

import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  cn
} from "@workspace/ui";

type SortOption = "updatedAt" | "usageCount" | "name" | "pinned";
type ViewMode = "grid" | "list";

type ComponentsFiltersBarProps = {
  search: string;
  selectedTags: string[];
  sort: SortOption;
  view: ViewMode;
  total: number;
  onSearchChange: (value: string) => void;
  onTagRemove: (tag: string) => void;
  onSortChange: (value: SortOption) => void;
  onViewChange: (value: ViewMode) => void;
};

const sortLabels: Record<SortOption, string> = {
  updatedAt: "Most Recent",
  usageCount: "Most Used",
  name: "Name A to Z",
  pinned: "Pinned first"
};

function ComponentsFiltersBar({
  search,
  selectedTags,
  sort,
  view,
  total,
  onSearchChange,
  onTagRemove,
  onSortChange,
  onViewChange
}: ComponentsFiltersBarProps) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [draftSearch, setDraftSearch] = React.useState(search);

  React.useEffect(() => {
    setDraftSearch(search);
  }, [search]);

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      onSearchChange(draftSearch.trim());
    }, 300);

    return () => window.clearTimeout(timer);
  }, [draftSearch, onSearchChange]);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      const modifier = isMac ? event.metaKey : event.ctrlKey;

      if (modifier && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="sticky top-[120px] z-10 border-b bg-background/95 px-4 py-3 backdrop-blur sm:px-6">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            ref={inputRef}
            value={draftSearch}
            onChange={(event) => setDraftSearch(event.target.value)}
            placeholder="Search components..."
            className="h-10 pl-9"
            aria-label="Search components"
          />
        </div>

        {selectedTags.length ? (
          <div className="flex flex-wrap gap-2">
            {selectedTags.map((tag) => (
              <button key={tag} type="button" onClick={() => onTagRemove(tag)}>
                <Badge variant="secondary" className="gap-1">
                  {tag}
                  <X className="h-3 w-3" aria-hidden="true" />
                </Badge>
              </button>
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" className="min-w-36 justify-between">
                {sortLabels[sort]}
                <span className="text-muted-foreground">▾</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {Object.entries(sortLabels).map(([value, label]) => (
                <DropdownMenuItem
                  key={value}
                  onClick={() => onSortChange(value as SortOption)}
                >
                  <span className="w-4">{sort === value ? "●" : ""}</span>
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="inline-flex rounded-md border bg-background p-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn("h-8 gap-1", view === "grid" && "bg-muted")}
              onClick={() => onViewChange("grid")}
            >
              <Grid2X2 className="h-4 w-4" aria-hidden="true" />
              Grid
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn("h-8 gap-1", view === "list" && "bg-muted")}
              onClick={() => onViewChange("list")}
            >
              <List className="h-4 w-4" aria-hidden="true" />
              List
            </Button>
          </div>

          <p className="min-w-40 text-right text-sm text-muted-foreground">
            Showing {total} component{total === 1 ? "" : "s"}
          </p>
        </div>
      </div>
    </div>
  );
}

export { ComponentsFiltersBar };
export type { SortOption, ViewMode };

"use client";

import { Check, ChevronDown, Grid2X2, List, Search, X } from "lucide-react";
import * as React from "react";

import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn
} from "@workspace/ui";
import type { DashboardWidgetStatus, DashboardWidgetType } from "@workspace/types";

import { formatWidgetStatus, formatWidgetType } from "./widget-labels";
import type { WidgetCategoryNavItem } from "./WidgetCategorySidebar";

export type WidgetSortOption = "updatedAt" | "name";
export type WidgetViewMode = "grid" | "list";

const ALL_CATEGORIES = "__all__";

type WidgetsFiltersBarProps = {
  search: string;
  categories: WidgetCategoryNavItem[];
  selectedCategoryId: string | null;
  selectedTags: string[];
  typeFilter: DashboardWidgetType | "all";
  statusFilter: DashboardWidgetStatus | "all";
  sort: WidgetSortOption;
  view: WidgetViewMode;
  total: number;
  onSearchChange: (value: string) => void;
  onCategoryChange: (id: string | null) => void;
  onTagRemove: (tag: string) => void;
  onTypeChange: (value: DashboardWidgetType | "all") => void;
  onStatusChange: (value: DashboardWidgetStatus | "all") => void;
  onSortChange: (value: WidgetSortOption) => void;
  onViewChange: (value: WidgetViewMode) => void;
};

const sortLabels: Record<WidgetSortOption, string> = {
  updatedAt: "Most Recent",
  name: "Name A to Z"
};

function WidgetsFiltersBar({
  search,
  categories,
  selectedCategoryId,
  selectedTags,
  typeFilter,
  statusFilter,
  sort,
  view,
  total,
  onSearchChange,
  onCategoryChange,
  onTagRemove,
  onTypeChange,
  onStatusChange,
  onSortChange,
  onViewChange
}: WidgetsFiltersBarProps) {
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

  const selectedCategory = React.useMemo(
    () =>
      selectedCategoryId
        ? categories.find((c) => c.id === selectedCategoryId)
        : undefined,
    [categories, selectedCategoryId]
  );

  const hasFilterChips =
    Boolean(selectedCategoryId) ||
    selectedTags.length > 0 ||
    typeFilter !== "all" ||
    statusFilter !== "all";

  return (
    <div className="sticky top-[120px] z-10 border-b bg-background/95 px-4 py-3 backdrop-blur sm:px-6">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="flex min-w-0 w-full flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="w-full shrink-0 sm:max-w-[280px] lg:hidden">
            <Select
              value={selectedCategoryId ?? ALL_CATEGORIES}
              onValueChange={(value) =>
                onCategoryChange(value === ALL_CATEGORIES ? null : value)
              }
            >
              <SelectTrigger className="h-10 w-full" aria-label="Filter by category">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_CATEGORIES}>All categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              ref={inputRef}
              value={draftSearch}
              onChange={(event) => setDraftSearch(event.target.value)}
              placeholder="Search widgets..."
              className="h-10 pl-9"
              aria-label="Search widgets"
            />
          </div>
        </div>

        {hasFilterChips ? (
          <div className="flex flex-wrap gap-2">
            {selectedCategoryId ? (
              selectedCategory ? (
                <button
                  type="button"
                  onClick={() => onCategoryChange(null)}
                  aria-label={`Remove category: ${selectedCategory.name}`}
                >
                  <Badge
                    variant="outline"
                    className="gap-1.5 border-border/80 bg-transparent font-normal text-foreground"
                  >
                    {selectedCategory.name}
                    <X className="h-3 w-3 shrink-0 opacity-70" aria-hidden="true" />
                  </Badge>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onCategoryChange(null)}
                  aria-label="Remove category filter"
                >
                  <Badge
                    variant="outline"
                    className="gap-1 border-border/80 bg-transparent font-normal"
                  >
                    Category
                    <X className="h-3 w-3 shrink-0 opacity-70" aria-hidden="true" />
                  </Badge>
                </button>
              )
            ) : null}
            {selectedTags.map((tag) => (
              <button key={tag} type="button" onClick={() => onTagRemove(tag)}>
                <Badge variant="secondary" className="gap-1">
                  {tag}
                  <X className="h-3 w-3" aria-hidden="true" />
                </Badge>
              </button>
            ))}
            {typeFilter !== "all" ? (
              <button
                type="button"
                onClick={() => onTypeChange("all")}
                aria-label="Remove type filter"
              >
                <Badge
                  variant="outline"
                  className="gap-1 border-border/80 bg-transparent font-normal"
                >
                  {formatWidgetType(typeFilter)}
                  <X className="h-3 w-3 shrink-0 opacity-70" aria-hidden="true" />
                </Badge>
              </button>
            ) : null}
            {statusFilter !== "all" ? (
              <button
                type="button"
                onClick={() => onStatusChange("all")}
                aria-label="Remove status filter"
              >
                <Badge
                  variant="outline"
                  className="gap-1 border-border/80 bg-transparent font-normal"
                >
                  {formatWidgetStatus(statusFilter)}
                  <X className="h-3 w-3 shrink-0 opacity-70" aria-hidden="true" />
                </Badge>
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={typeFilter}
            onValueChange={(v) => onTypeChange(v as DashboardWidgetType | "all")}
          >
            <SelectTrigger className="h-10 w-[150px]" aria-label="Filter by type">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="VANILLA_JS">{formatWidgetType("VANILLA_JS")}</SelectItem>
              <SelectItem value="REACT">{formatWidgetType("REACT")}</SelectItem>
              <SelectItem value="WEB_COMPONENT">
                {formatWidgetType("WEB_COMPONENT")}
              </SelectItem>
              <SelectItem value="IFRAME">{formatWidgetType("IFRAME")}</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={statusFilter}
            onValueChange={(v) => onStatusChange(v as DashboardWidgetStatus | "all")}
          >
            <SelectTrigger className="h-10 w-[150px]" aria-label="Filter by status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="DRAFT">{formatWidgetStatus("DRAFT")}</SelectItem>
              <SelectItem value="PUBLISHED">{formatWidgetStatus("PUBLISHED")}</SelectItem>
              <SelectItem value="DEPRECATED">
                {formatWidgetStatus("DEPRECATED")}
              </SelectItem>
            </SelectContent>
          </Select>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="min-w-36 justify-between gap-2"
              >
                {sortLabels[sort]}
                <ChevronDown
                  className="h-4 w-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {(Object.keys(sortLabels) as WidgetSortOption[]).map((key) => (
                <DropdownMenuItem key={key} onClick={() => onSortChange(key)}>
                  <Check
                    className={cn("h-4 w-4", sort === key ? "opacity-100" : "opacity-0")}
                    aria-hidden="true"
                  />
                  {sortLabels[key]}
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
            Showing {total} widget{total === 1 ? "" : "s"}
          </p>
        </div>
      </div>
    </div>
  );
}

export { WidgetsFiltersBar };

"use client";

import { ChevronDown, Plus, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { parseAsArrayOf, parseAsString, useQueryState } from "nuqs";
import * as React from "react";

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@workspace/ui";
import type {
  DashboardWidgetStatus,
  DashboardWidgetType,
  WidgetLibraryListItem,
  WidgetsQueryParams
} from "@workspace/types";

import { useWidgets } from "../../../../hooks/use-widgets";
import { WidgetCategorySidebar } from "./WidgetCategorySidebar";
import { WidgetGrid } from "./WidgetGrid";
import { WidgetPreviewDrawer } from "./WidgetPreviewDrawer";
import {
  WidgetsFiltersBar,
  type WidgetSortOption,
  type WidgetViewMode
} from "./WidgetsFiltersBar";

const UNCATEGORIZED = "__uncategorized__";

function WidgetsPageClient() {
  const router = useRouter();
  const [search, setSearch] = useQueryState("q", parseAsString.withDefault(""));
  const [categoryId, setCategoryId] = useQueryState("cat", parseAsString);
  const [tags, setTags] = useQueryState(
    "tags",
    parseAsArrayOf(parseAsString).withDefault([])
  );
  const [typeFilter, setTypeFilter] = useQueryState(
    "type",
    parseAsString.withDefault("all")
  );
  const [statusFilter, setStatusFilter] = useQueryState(
    "status",
    parseAsString.withDefault("all")
  );
  const [sort, setSort] = useQueryState("sort", parseAsString.withDefault("updatedAt"));
  const [view, setView] = React.useState<WidgetViewMode>("grid");
  const [previewId, setPreviewId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const saved = window.localStorage.getItem("widget-library-view");
    if (saved === "grid" || saved === "list") {
      setView(saved);
    }
  }, []);

  const safeSort: WidgetSortOption = sort === "name" ? "name" : "updatedAt";

  const needsWideFetch = tags.length > 1 || categoryId === UNCATEGORIZED;

  const queryParams = React.useMemo<WidgetsQueryParams>(() => {
    const params: WidgetsQueryParams = {
      limit: needsWideFetch ? 200 : 100,
      page: 1,
      search: search || undefined
    };

    if (statusFilter && statusFilter !== "all") {
      params.status = statusFilter as DashboardWidgetStatus;
    }

    if (typeFilter && typeFilter !== "all") {
      params.type = typeFilter as DashboardWidgetType;
    }

    if (tags.length === 1) {
      params.tag = tags[0];
    }

    if (categoryId && categoryId !== UNCATEGORIZED) {
      params.category = categoryId;
    }

    return params;
  }, [categoryId, needsWideFetch, search, statusFilter, tags, typeFilter]);

  const widgetsQuery = useWidgets(queryParams);
  const allWidgetsQuery = useWidgets({ limit: 200, page: 1 });

  const rawList = widgetsQuery.data?.data ?? [];
  const widgets = React.useMemo(
    () => sortWidgets(rawList, safeSort, categoryId, tags),
    [rawList, safeSort, categoryId, tags]
  );

  const allWidgets = allWidgetsQuery.data?.data ?? [];
  const categories = React.useMemo(() => buildCategories(allWidgets), [allWidgets]);

  const hasFilters = Boolean(
    search ||
    categoryId ||
    tags.length ||
    (typeFilter && typeFilter !== "all") ||
    (statusFilter && statusFilter !== "all")
  );

  const updateTags = React.useCallback(
    (next: string[]) => {
      void setTags(next);
    },
    [setTags]
  );

  const toggleTag = React.useCallback(
    (tag: string) => {
      updateTags(tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag]);
    },
    [tags, updateTags]
  );

  const clearFilters = React.useCallback(() => {
    void setSearch("");
    void setCategoryId(null);
    void setTags([]);
    void setTypeFilter("all");
    void setStatusFilter("all");
  }, [setCategoryId, setSearch, setTags, setStatusFilter, setTypeFilter]);

  const updateView = React.useCallback((next: WidgetViewMode) => {
    setView(next);
    window.localStorage.setItem("widget-library-view", next);
  }, []);

  const openEditor = React.useCallback(
    (id: string) => {
      router.push(`/dashboard/widgets/${id}/edit`);
    },
    [router]
  );

  const addWidget = React.useCallback(() => {
    router.push("/dashboard/widgets/new");
  }, [router]);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background">
      <header className="sticky top-16 z-20 flex h-14 items-center justify-between gap-4 border-b bg-background/95 px-4 backdrop-blur sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <h1 className="truncate text-xl font-semibold tracking-tight">Widgets</h1>
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {widgetsQuery.data?.total ?? widgets.length} widgets
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <DropdownMenu>
            <div className="flex">
              <Button
                type="button"
                onClick={addWidget}
                className="rounded-r-none border-r border-r-primary-foreground/20 pr-3"
              >
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                Add Widget
              </Button>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  className="rounded-l-none px-2"
                  aria-label="More add options"
                >
                  <ChevronDown className="h-4 w-4" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
            </div>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem disabled>
                <Zap className="mr-2 h-4 w-4" aria-hidden="true" />
                Quick register
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="grid lg:grid-cols-[240px_1fr]">
        <WidgetCategorySidebar
          categories={categories}
          widgets={allWidgets}
          selectedCategory={categoryId}
          selectedTags={tags}
          onCategoryChange={(id) => void setCategoryId(id)}
          onTagToggle={toggleTag}
        />
        <main className="min-w-0">
          <WidgetsFiltersBar
            search={search}
            categories={categories}
            selectedCategoryId={categoryId}
            selectedTags={tags}
            typeFilter={(typeFilter as DashboardWidgetType | "all") ?? "all"}
            statusFilter={(statusFilter as DashboardWidgetStatus | "all") ?? "all"}
            sort={safeSort}
            view={view}
            total={widgetsQuery.data?.total ?? widgets.length}
            onSearchChange={(v) => void setSearch(v || null)}
            onCategoryChange={(id) => void setCategoryId(id)}
            onTagRemove={toggleTag}
            onTypeChange={(v) => void setTypeFilter(v)}
            onStatusChange={(v) => void setStatusFilter(v)}
            onSortChange={(v) => void setSort(v)}
            onViewChange={updateView}
          />
          <div className="p-4 sm:p-6">
            <WidgetGrid
              widgets={widgets}
              view={view}
              isLoading={widgetsQuery.isLoading || allWidgetsQuery.isLoading}
              hasFilters={hasFilters}
              onOpenPreview={setPreviewId}
              onOpenEditor={openEditor}
              onClearFilters={clearFilters}
              onAddWidget={addWidget}
            />
          </div>
        </main>
      </div>

      <WidgetPreviewDrawer
        widgetId={previewId}
        isOpen={Boolean(previewId)}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewId(null);
          }
        }}
        onEdit={openEditor}
      />
    </div>
  );
}

function sortWidgets(
  list: WidgetLibraryListItem[],
  sort: WidgetSortOption,
  cat: string | null,
  tagList: string[]
): WidgetLibraryListItem[] {
  let next = [...list];

  if (cat === UNCATEGORIZED) {
    next = next.filter((w) => !w.category);
  }

  if (tagList.length > 1) {
    next = next.filter((w) => tagList.every((t) => w.tags.includes(t)));
  }

  next.sort((a, b) => {
    if (sort === "name") {
      return a.name.localeCompare(b.name);
    }

    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return next;
}

function buildCategories(widgets: WidgetLibraryListItem[]) {
  const map = new Map<string, number>();

  for (const w of widgets) {
    const key = w.category?.trim() || UNCATEGORIZED;
    map.set(key, (map.get(key) ?? 0) + 1);
  }

  const items = [...map.entries()].map(([key, count]) => ({
    id: key === UNCATEGORIZED ? UNCATEGORIZED : key,
    name: key === UNCATEGORIZED ? "Uncategorized" : key,
    count
  }));

  return items.sort((a, b) => a.name.localeCompare(b.name));
}

export { WidgetsPageClient };

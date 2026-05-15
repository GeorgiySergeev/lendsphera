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
  ComponentCategory,
  ComponentListItem,
  ComponentsQueryParams
} from "@workspace/types";

import { useComponentCategories, useComponents } from "../../../../hooks/use-components";
import { CategorySidebar } from "./CategorySidebar";
import { ComponentGrid } from "./ComponentGrid";
import { ComponentPreviewDrawer } from "./ComponentPreviewDrawer";
import {
  ComponentsFiltersBar,
  type SortOption,
  type ViewMode
} from "./ComponentsFiltersBar";
import { QuickAddDialog } from "./QuickAddDialog";

function ComponentsPageClient() {
  const router = useRouter();
  const [search, setSearch] = useQueryState("q", parseAsString.withDefault(""));
  const [categoryId, setCategoryId] = useQueryState("cat", parseAsString);
  const [tags, setTags] = useQueryState(
    "tags",
    parseAsArrayOf(parseAsString).withDefault([])
  );
  const [sort, setSort] = useQueryState("sort", parseAsString.withDefault("updatedAt"));
  const [view, setView] = React.useState<ViewMode>("grid");
  const [previewId, setPreviewId] = React.useState<string | null>(null);
  const [quickAddOpen, setQuickAddOpen] = React.useState(false);

  React.useEffect(() => {
    const saved = window.localStorage.getItem("component-library-view");
    if (saved === "grid" || saved === "list") {
      setView(saved);
    }
  }, []);

  const safeSort = isSortOption(sort) ? sort : "updatedAt";
  const queryParams = React.useMemo<ComponentsQueryParams>(() => {
    const sortBy =
      safeSort === "pinned"
        ? "updatedAt"
        : safeSort === "name"
          ? "name"
          : safeSort === "usageCount"
            ? "usageCount"
            : "updatedAt";

    return {
      categoryId: categoryId ?? undefined,
      tags: tags.length ? tags : undefined,
      search: search || undefined,
      isPublic: true,
      limit: 100,
      sortBy,
      sortDir: safeSort === "name" ? "asc" : "desc"
    };
  }, [categoryId, safeSort, search, tags]);

  const componentsQuery = useComponents(queryParams);
  const allComponentsQuery = useComponents({
    isPublic: true,
    limit: 100,
    sortBy: "updatedAt",
    sortDir: "desc"
  });
  const categoriesQuery = useComponentCategories();
  const components = React.useMemo(
    () => sortComponents(componentsQuery.data?.data ?? [], safeSort),
    [componentsQuery.data?.data, safeSort]
  );
  const allComponents = allComponentsQuery.data?.data ?? components;
  const categories = React.useMemo(
    () => mergeCategories(categoriesQuery.data ?? [], allComponents),
    [allComponents, categoriesQuery.data]
  );
  const hasFilters = Boolean(search || categoryId || tags.length);

  const updateTags = React.useCallback(
    (nextTags: string[]) => {
      void setTags(nextTags);
    },
    [setTags]
  );

  const toggleTag = React.useCallback(
    (tag: string) => {
      updateTags(
        tags.includes(tag) ? tags.filter((item) => item !== tag) : [...tags, tag]
      );
    },
    [tags, updateTags]
  );

  const clearFilters = React.useCallback(() => {
    void setSearch("");
    void setCategoryId(null);
    void setTags([]);
  }, [setCategoryId, setSearch, setTags]);

  const updateView = React.useCallback((nextView: ViewMode) => {
    setView(nextView);
    window.localStorage.setItem("component-library-view", nextView);
  }, []);

  const openEditor = React.useCallback(
    (id: string) => {
      router.push(`/dashboard/components/${id}/edit`);
    },
    [router]
  );

  const addComponent = React.useCallback(() => {
    router.push("/dashboard/components/new");
  }, [router]);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background">
      <header className="sticky top-16 z-20 flex h-14 items-center justify-between gap-4 border-b bg-background/95 px-4 backdrop-blur sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <h1 className="truncate text-xl font-semibold tracking-tight">
            Component Library
          </h1>
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {componentsQuery.data?.total ?? allComponents.length} components
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <DropdownMenu>
            <div className="flex">
              <Button
                type="button"
                onClick={addComponent}
                className="rounded-r-none border-r border-r-primary-foreground/20 pr-3"
              >
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                Add Component
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
              <DropdownMenuItem onClick={() => setQuickAddOpen(true)}>
                <Zap className="mr-2 h-4 w-4" aria-hidden="true" />
                Quick Add
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="grid lg:grid-cols-[240px_1fr]">
        <CategorySidebar
          categories={categories}
          components={allComponents}
          selectedCategory={categoryId}
          selectedTags={tags}
          onCategoryChange={(id) => void setCategoryId(id)}
          onTagToggle={toggleTag}
        />
        <main className="min-w-0">
          <ComponentsFiltersBar
            search={search}
            categories={categories}
            selectedCategoryId={categoryId}
            selectedTags={tags}
            sort={safeSort}
            view={view}
            total={componentsQuery.data?.total ?? components.length}
            onSearchChange={(value) => void setSearch(value)}
            onCategoryChange={(id) => void setCategoryId(id)}
            onTagRemove={toggleTag}
            onSortChange={(value) => void setSort(value)}
            onViewChange={updateView}
          />
          <div className="p-4 sm:p-6">
            <ComponentGrid
              components={components}
              view={view}
              selectedCategory={categoryId}
              isLoading={
                componentsQuery.isLoading ||
                categoriesQuery.isLoading ||
                allComponentsQuery.isLoading
              }
              hasSearch={hasFilters}
              onOpenPreview={setPreviewId}
              onOpenEditor={openEditor}
              onClearFilters={clearFilters}
              onAddComponent={addComponent}
            />
          </div>
        </main>
      </div>

      <ComponentPreviewDrawer
        componentId={previewId}
        isOpen={Boolean(previewId)}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewId(null);
          }
        }}
        onEdit={openEditor}
      />

      <QuickAddDialog isOpen={quickAddOpen} onOpenChange={setQuickAddOpen} />
    </div>
  );
}

function isSortOption(value: string): value is SortOption {
  return ["updatedAt", "usageCount", "name", "pinned"].includes(value);
}

function sortComponents(components: ComponentListItem[], sort: SortOption) {
  const next = [...components];

  if (sort === "pinned") {
    next.sort(
      (a, b) =>
        Number(b.isPinned) - Number(a.isPinned) ||
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  return next;
}

function mergeCategories(
  categories: ComponentCategory[],
  components: ComponentListItem[]
) {
  if (categories.length) {
    return categories;
  }

  const map = new Map<string, ComponentCategory>();

  for (const component of components) {
    map.set(component.category.id, component.category);
  }

  return [...map.values()].sort((a, b) => a.sortOrder - b.sortOrder);
}

export { ComponentsPageClient };

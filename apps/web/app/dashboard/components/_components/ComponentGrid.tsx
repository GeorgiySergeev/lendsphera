"use client";

import { Blocks, Plus, SearchX } from "lucide-react";

import {
  Badge,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@workspace/ui";
import type { ComponentListItem } from "@workspace/types";

import { ComponentCard } from "./ComponentCard";
import { ComponentCardSkeleton } from "./ComponentCardSkeleton";
import type { ViewMode } from "./ComponentsFiltersBar";
import { buildCardPreviewHtml } from "./preview-html";

type ComponentGridProps = {
  components: ComponentListItem[];
  view: ViewMode;
  selectedCategory: string | null;
  isLoading: boolean;
  hasSearch: boolean;
  onOpenPreview: (id: string) => void;
  onOpenEditor: (id: string) => void;
  onClearFilters: () => void;
  onAddComponent: () => void;
};

function ComponentGrid({
  components,
  view,
  selectedCategory,
  isLoading,
  hasSearch,
  onOpenPreview,
  onOpenEditor,
  onClearFilters,
  onAddComponent
}: ComponentGridProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <ComponentCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (!components.length) {
    return (
      <EmptyState
        hasSearch={hasSearch}
        onClearFilters={onClearFilters}
        onAddComponent={onAddComponent}
      />
    );
  }

  if (view === "list") {
    return (
      <ComponentsList
        components={components}
        onOpenPreview={onOpenPreview}
        onOpenEditor={onOpenEditor}
      />
    );
  }

  if (selectedCategory) {
    return (
      <CardsGrid
        components={components}
        onOpenPreview={onOpenPreview}
        onOpenEditor={onOpenEditor}
      />
    );
  }

  const pinned = components.filter((component) => component.isPinned);
  const rest = components.filter((component) => !component.isPinned);
  const sections = groupByCategory(rest);

  return (
    <div className="space-y-8">
      {pinned.length ? (
        <ComponentSection
          title="Pinned"
          count={pinned.length}
          components={pinned}
          onOpenPreview={onOpenPreview}
          onOpenEditor={onOpenEditor}
        />
      ) : null}
      {sections.map((section) => (
        <ComponentSection
          key={section.categoryId}
          title={`${section.icon ? `${section.icon} ` : ""}${section.name}`}
          count={section.components.length}
          components={section.components}
          onOpenPreview={onOpenPreview}
          onOpenEditor={onOpenEditor}
        />
      ))}
    </div>
  );
}

function ComponentSection({
  title,
  count,
  components,
  onOpenPreview,
  onOpenEditor
}: {
  title: string;
  count: number;
  components: ComponentListItem[];
  onOpenPreview: (id: string) => void;
  onOpenEditor: (id: string) => void;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        <Badge variant="secondary">{count}</Badge>
        <div className="h-px flex-1 bg-border" />
      </div>
      <CardsGrid
        components={components}
        onOpenPreview={onOpenPreview}
        onOpenEditor={onOpenEditor}
      />
    </section>
  );
}

function CardsGrid({
  components,
  onOpenPreview,
  onOpenEditor
}: {
  components: ComponentListItem[];
  onOpenPreview: (id: string) => void;
  onOpenEditor: (id: string) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {components.map((component) => (
        <ComponentCard
          key={component.id}
          component={component}
          onOpenPreview={onOpenPreview}
          onOpenEditor={onOpenEditor}
        />
      ))}
    </div>
  );
}

function ComponentsList({
  components,
  onOpenPreview,
  onOpenEditor
}: {
  components: ComponentListItem[];
  onOpenPreview: (id: string) => void;
  onOpenEditor: (id: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Preview</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Tags</TableHead>
            <TableHead>Usage</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {components.map((component) => (
            <TableRow key={component.id}>
              <TableCell>
                <button
                  type="button"
                  onClick={() => onOpenPreview(component.id)}
                  className="h-12 w-20 overflow-hidden rounded-md border bg-muted"
                  aria-label={`Preview ${component.name}`}
                >
                  <iframe
                    title={`${component.name} mini preview`}
                    srcDoc={buildCardPreviewHtml(component)}
                    className="pointer-events-none h-[666%] w-[666%] origin-top-left border-0"
                    style={{ transform: "scale(0.15)" }}
                    sandbox="allow-scripts"
                  />
                </button>
              </TableCell>
              <TableCell>
                <div className="max-w-md">
                  <p className="font-medium">{component.name}</p>
                  <p className="line-clamp-1 text-xs text-muted-foreground">
                    {component.description}
                  </p>
                </div>
              </TableCell>
              <TableCell>
                <span className="inline-flex items-center gap-2 text-sm">
                  <span aria-hidden="true">{component.category.icon ?? "□"}</span>
                  {component.category.name}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex max-w-sm flex-wrap gap-1.5">
                  {component.tags.slice(0, 4).map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell>{component.usageCount}x</TableCell>
              <TableCell className="text-right">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenEditor(component.id)}
                >
                  Edit
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function EmptyState({
  hasSearch,
  onClearFilters,
  onAddComponent
}: {
  hasSearch: boolean;
  onClearFilters: () => void;
  onAddComponent: () => void;
}) {
  const Icon = hasSearch ? SearchX : Blocks;

  return (
    <div className="flex min-h-96 flex-col items-center justify-center rounded-lg border border-dashed bg-muted/20 p-8 text-center">
      <Icon className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
      <h2 className="mt-4 text-lg font-semibold">
        {hasSearch ? "No components match your search" : "No components in this category yet"}
      </h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        {hasSearch
          ? "Try a different keyword, remove a tag, or clear the selected category."
          : "Create or import reusable Tailwind sections before building landing pages."}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {hasSearch ? (
          <Button type="button" variant="outline" onClick={onClearFilters}>
            Clear filters
          </Button>
        ) : null}
        <Button type="button" onClick={onAddComponent}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add Component
        </Button>
      </div>
    </div>
  );
}

function groupByCategory(components: ComponentListItem[]) {
  const groups = new Map<
    string,
    {
      categoryId: string;
      icon?: string;
      name: string;
      sortOrder: number;
      components: ComponentListItem[];
    }
  >();

  for (const component of components) {
    const group = groups.get(component.category.id);

    if (group) {
      group.components.push(component);
      continue;
    }

    groups.set(component.category.id, {
      categoryId: component.category.id,
      icon: component.category.icon,
      name: component.category.name,
      sortOrder: component.category.sortOrder,
      components: [component]
    });
  }

  return [...groups.values()].sort((a, b) => a.sortOrder - b.sortOrder);
}

export { ComponentGrid };

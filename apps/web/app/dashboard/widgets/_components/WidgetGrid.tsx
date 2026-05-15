"use client";

import { Blocks, Plus, SearchX } from "lucide-react";

import { Button, Skeleton } from "@workspace/ui";
import type { WidgetLibraryListItem } from "@workspace/types";

import { WidgetCard } from "./WidgetCard";
import type { WidgetViewMode } from "./WidgetsFiltersBar";
import { WidgetsListTable } from "./WidgetsListTable";

type WidgetGridProps = {
  widgets: WidgetLibraryListItem[];
  view: WidgetViewMode;
  isLoading: boolean;
  hasFilters: boolean;
  onOpenPreview: (id: string) => void;
  onOpenEditor: (id: string) => void;
  onClearFilters: () => void;
  onAddWidget: () => void;
};

function WidgetGrid({
  widgets,
  view,
  isLoading,
  hasFilters,
  onOpenPreview,
  onOpenEditor,
  onClearFilters,
  onAddWidget
}: WidgetGridProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-72 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!widgets.length) {
    return (
      <EmptyState
        hasFilters={hasFilters}
        onClearFilters={onClearFilters}
        onAddWidget={onAddWidget}
      />
    );
  }

  if (view === "list") {
    return (
      <WidgetsListTable
        widgets={widgets}
        onOpenPreview={onOpenPreview}
        onOpenEditor={onOpenEditor}
      />
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {widgets.map((widget) => (
        <WidgetCard
          key={widget.id}
          widget={widget}
          onOpenPreview={onOpenPreview}
          onOpenEditor={onOpenEditor}
        />
      ))}
    </div>
  );
}

function EmptyState({
  hasFilters,
  onClearFilters,
  onAddWidget
}: {
  hasFilters: boolean;
  onClearFilters: () => void;
  onAddWidget: () => void;
}) {
  const Icon = hasFilters ? SearchX : Blocks;

  return (
    <div className="flex min-h-96 flex-col items-center justify-center rounded-lg border border-dashed bg-muted/20 p-8 text-center">
      <Icon className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
      <h2 className="mt-4 text-lg font-semibold">
        {hasFilters ? "No widgets match your search" : "No widgets yet"}
      </h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        {hasFilters
          ? "Try a different keyword, remove a tag, or clear filters."
          : "Create a widget and register a bundle version, or publish from CI."}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {hasFilters ? (
          <Button type="button" variant="outline" onClick={onClearFilters}>
            Clear filters
          </Button>
        ) : null}
        <Button type="button" onClick={onAddWidget}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add Widget
        </Button>
      </div>
    </div>
  );
}

export { WidgetGrid };

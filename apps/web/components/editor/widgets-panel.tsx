"use client";

import * as React from "react";
import { Blocks, Search } from "lucide-react";
import type { Editor } from "grapesjs";

import {
  buildDefaultProps,
  serializeWidgetProps,
  type WidgetSchema
} from "@workspace/widgets";
import type { WidgetLibraryListItem } from "@workspace/types";
import { Button, Input, ScrollArea, Skeleton } from "@workspace/ui";

import { useWidgets } from "../../hooks/use-widgets";
import {
  insertHtmlAtSelection,
  type EditorLike
} from "../../lib/editor/landing-editor-adapter";
import { toast } from "../../lib/toast";

type WidgetsPanelProps = {
  editor: Editor | null;
};

function escapeHtmlAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function normalizeSchema(raw: unknown): WidgetSchema {
  if (
    raw &&
    typeof raw === "object" &&
    "fields" in raw &&
    Array.isArray((raw as WidgetSchema).fields)
  ) {
    return raw as WidgetSchema;
  }

  return { fields: [] };
}

function buildInsertSnippet(widget: WidgetLibraryListItem): string | null {
  const latest = widget.versions[0];

  if (!latest) {
    return null;
  }

  const schema = normalizeSchema(latest.schema);
  const defaults = buildDefaultProps(schema);
  const propsJson = serializeWidgetProps(defaults);
  const propsAttr = propsJson.replaceAll("'", "&#39;");
  const schemaEnc = encodeURIComponent(JSON.stringify(schema));
  const bundleEnc = encodeURIComponent(latest.bundleUrl);

  return `<div class="ls-widget-root" style="min-height:48px" data-widget="${escapeHtmlAttr(widget.slug)}" data-widget-version="${escapeHtmlAttr(latest.version)}" data-widget-bundle-url="${bundleEnc}" data-widget-schema="${schemaEnc}" data-widget-props='${propsAttr}'></div>`;
}

function WidgetsPanel({ editor }: WidgetsPanelProps) {
  const { data, isLoading } = useWidgets({ limit: 100, page: 1, status: "PUBLISHED" });
  const widgets = data?.data ?? [];
  const [search, setSearch] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) {
      return widgets;
    }

    return widgets.filter(
      (w) =>
        w.name.toLowerCase().includes(q) ||
        w.slug.toLowerCase().includes(q) ||
        w.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [search, widgets]);

  const handleInsert = (widget: WidgetLibraryListItem) => {
    if (!editor) {
      return;
    }

    const html = buildInsertSnippet(widget);

    if (!html) {
      toast.error(
        "No bundle version",
        "Publish a version for this widget in the dashboard first."
      );

      return;
    }

    const added = insertHtmlAtSelection(editor as unknown as EditorLike, html);

    if (added) {
      setTimeout(() => {
        try {
          const el = (added as { getEl?: () => HTMLElement | undefined }).getEl?.();
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            const originalOutline = el.style.outline;
            el.style.outline = "2px solid var(--primary)";
            setTimeout(() => {
              el.style.outline = originalOutline;
            }, 1000);
          }
        } catch {
          // ignore scroll errors
        }
      }, 50);
    }

    toast.success(`"${widget.name}" added to canvas`);
  };

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="border-b p-3">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search widgets…"
            className="pl-8"
            aria-label="Search widgets"
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Published widgets from the registry (bundled JS).
        </p>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-2 p-3">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-md" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
              No published widgets match your search.
            </div>
          ) : (
            filtered.map((widget) => {
              const latest = widget.versions[0];
              const hasVersion = Boolean(latest);

              return (
                <Button
                  key={widget.id}
                  type="button"
                  variant="outline"
                  className="h-auto w-full flex-col items-start gap-1 py-3 text-left"
                  disabled={!hasVersion}
                  onClick={() => handleInsert(widget)}
                >
                  <span className="flex w-full items-center gap-2 font-medium">
                    <Blocks
                      className="h-4 w-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <span className="truncate">{widget.name}</span>
                  </span>
                  <span className="w-full truncate font-mono text-[10px] text-muted-foreground">
                    {widget.slug}
                  </span>
                  {latest ? (
                    <span className="text-[10px] text-muted-foreground">
                      v{latest.version}
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">
                      No version — add in dashboard
                    </span>
                  )}
                </Button>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export { WidgetsPanel };

"use client";

import { Copy, ExternalLink } from "lucide-react";
import * as React from "react";

import {
  Button,
  ScrollArea,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Skeleton
} from "@workspace/ui";

import { useWidget } from "../../../../hooks/use-widgets";
import { toast } from "../../../../lib/toast";
import { formatWidgetStatus, formatWidgetType } from "./widget-labels";

type WidgetPreviewDrawerProps = {
  widgetId: string | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (id: string) => void;
};

function WidgetPreviewDrawer({
  widgetId,
  isOpen,
  onOpenChange,
  onEdit
}: WidgetPreviewDrawerProps) {
  const widgetQuery = useWidget(widgetId ?? "");
  const w = widgetQuery.data;

  const schemaText = React.useMemo(() => {
    const latest = w?.versions.find((v) => v.isLatest) ?? w?.versions[0];

    if (!latest?.schema) {
      return "";
    }

    try {
      return JSON.stringify(latest.schema, null, 2);
    } catch {
      return String(latest.schema);
    }
  }, [w?.versions]);

  const copySchema = async () => {
    if (!schemaText) {
      return;
    }

    await navigator.clipboard.writeText(schemaText);
    toast.success("Schema JSON copied");
  };

  const latest = w?.versions.find((v) => v.isLatest) ?? w?.versions[0];

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-[95vw] flex-col p-0 sm:w-[88vw] xl:w-[55vw]"
      >
        <SheetHeader className="border-b p-4 pr-12">
          <SheetTitle className="truncate">{w?.name ?? "Widget"}</SheetTitle>
          <SheetDescription>
            Bundle metadata and constructor schema for the latest version.
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-4 p-4">
            {widgetQuery.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-40 w-full" />
              </div>
            ) : w ? (
              <>
                <dl className="grid gap-2 text-sm">
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Slug</dt>
                    <dd className="font-mono text-xs">{w.slug}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Type</dt>
                    <dd>{formatWidgetType(w.type)}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Status</dt>
                    <dd>{formatWidgetStatus(w.status)}</dd>
                  </div>
                  {w.description ? (
                    <div>
                      <dt className="text-muted-foreground">Description</dt>
                      <dd className="mt-1 text-foreground">{w.description}</dd>
                    </div>
                  ) : null}
                </dl>
                {latest ? (
                  <div className="rounded-lg border bg-muted p-3 text-sm">
                    <p className="font-medium">Latest version: {latest.version}</p>
                    <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                      {latest.bundleUrl}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Hash: {latest.bundleHash}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          void navigator.clipboard
                            .writeText(latest.bundleUrl)
                            .then(() => toast.success("URL copied"))
                        }
                      >
                        <Copy className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                        Copy URL
                      </Button>
                      <Button type="button" variant="outline" size="sm" asChild>
                        <a
                          href={latest.bundleUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink
                            className="mr-1.5 h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                          Open bundle
                        </a>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No versions registered yet.
                  </p>
                )}
                {w.previewUrl ? (
                  <div className="aspect-video overflow-hidden rounded-lg border bg-muted">
                    <iframe
                      title="Widget preview"
                      src={w.previewUrl}
                      className="h-full w-full border-0"
                    />
                  </div>
                ) : null}
                {schemaText ? (
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-medium">Schema (JSON)</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => void copySchema()}
                      >
                        <Copy className="mr-1 h-3 w-3" aria-hidden="true" />
                        Copy
                      </Button>
                    </div>
                    <pre className="max-h-64 overflow-auto rounded-md border bg-muted/50 p-3 text-xs">
                      {schemaText}
                    </pre>
                  </div>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Could not load widget.</p>
            )}
          </div>
        </ScrollArea>
        {w ? (
          <div className="border-t p-4">
            <Button type="button" className="w-full" onClick={() => onEdit(w.id)}>
              Open editor
            </Button>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

export { WidgetPreviewDrawer };

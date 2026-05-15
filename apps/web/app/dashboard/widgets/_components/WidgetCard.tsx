"use client";

import { Blocks, Copy, Eye, MoreHorizontal, Pencil } from "lucide-react";
import * as React from "react";

import {
  Badge,
  Button,
  Card,
  CardContent,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@workspace/ui";
import type { WidgetLibraryListItem } from "@workspace/types";

import { toast } from "../../../../lib/toast";
import { formatWidgetStatus, formatWidgetType } from "./widget-labels";

type WidgetCardProps = {
  widget: WidgetLibraryListItem;
  onOpenPreview: (id: string) => void;
  onOpenEditor: (id: string) => void;
};

const previewHeightPx = 150;

function latestVersion(widget: WidgetLibraryListItem) {
  return widget.versions[0] ?? null;
}

function WidgetCard({ widget, onOpenPreview, onOpenEditor }: WidgetCardProps) {
  const latest = latestVersion(widget);

  const copyBundleUrl = async () => {
    if (!latest?.bundleUrl) {
      toast.error("No bundle URL", "Register a version first.");

      return;
    }

    await navigator.clipboard.writeText(latest.bundleUrl);
    toast.success("Bundle URL copied");
  };

  return (
    <Card className="group overflow-hidden rounded-lg">
      <div
        className="relative overflow-hidden border-b bg-muted"
        style={{ height: `${previewHeightPx}px` }}
      >
        <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
          <Blocks className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
          {latest ? (
            <p className="text-xs text-muted-foreground">
              Latest <span className="font-mono text-foreground">{latest.version}</span>
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">No bundle version yet</p>
          )}
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100">
          <div className="flex flex-wrap justify-center gap-2 px-4">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onOpenPreview(widget.id)}
            >
              <Eye className="h-4 w-4" aria-hidden="true" />
              Preview
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onOpenEditor(widget.id)}
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Edit
            </Button>
          </div>
        </div>
        <div className="absolute right-2 top-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="h-8 w-8 shadow-sm"
                aria-label="More actions"
              >
                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onOpenPreview(widget.id)}>
                <Eye className="mr-2 h-4 w-4" aria-hidden="true" />
                Preview
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onOpenEditor(widget.id)}>
                <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void copyBundleUrl()}>
                <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
                Copy bundle URL
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <CardContent className="space-y-3 p-4">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold">{widget.name}</h3>
          <p className="truncate font-mono text-xs text-muted-foreground">
            {widget.slug}
          </p>
          {widget.description ? (
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
              {widget.description}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className="text-[10px] font-normal">
            {formatWidgetType(widget.type)}
          </Badge>
          <Badge variant="secondary" className="text-[10px] font-normal">
            {formatWidgetStatus(widget.status)}
          </Badge>
          {widget.category ? (
            <Badge variant="outline" className="text-[10px] font-normal">
              {widget.category}
            </Badge>
          ) : null}
        </div>
        {widget.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {widget.tags.slice(0, 4).map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export { WidgetCard, latestVersion };

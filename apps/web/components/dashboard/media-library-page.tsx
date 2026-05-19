"use client";

import { useQueryState } from "nuqs";
import * as React from "react";
import { Files, Filter, FolderOpen, ImageIcon, Search, Video } from "lucide-react";

import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Skeleton
} from "@workspace/ui";

import { useAssets } from "../../hooks/use-assets";
import type { AssetRecord, AssetType } from "../../lib/api/assets";

const assetTypeOptions: Array<{ label: string; value: AssetType | "all" }> = [
  { label: "All assets", value: "all" },
  { label: "Images", value: "IMAGE" },
  { label: "Videos", value: "VIDEO" },
  { label: "Documents", value: "DOCUMENT" },
  { label: "Fonts", value: "FONT" },
  { label: "Other", value: "OTHER" }
];

function MediaLibraryPage() {
  const [search, setSearch] = useQueryState("search", { defaultValue: "" });
  const [type, setType] = useQueryState<AssetType | "all">("type", {
    defaultValue: "all",
    parse: (value) =>
      assetTypeOptions.some((option) => option.value === value)
        ? (value as AssetType | "all")
        : "all",
    serialize: (value) => value
  });
  const [selectedAssetId, setSelectedAssetId] = React.useState<string | null>(null);

  const assetsQuery = useAssets({
    limit: 100,
    page: 1,
    search: search || undefined,
    type
  });

  const assets = assetsQuery.data?.items ?? [];
  const folders = React.useMemo(() => {
    return Array.from(
      new Set(
        assets
          .map((asset) => asset.folder?.trim())
          .filter((folder): folder is string => Boolean(folder))
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [assets]);

  const selectedAsset = React.useMemo(
    () => assets.find((asset) => asset.id === selectedAssetId) ?? null,
    [assets, selectedAssetId]
  );

  const stats = React.useMemo(() => {
    return {
      images: assets.filter((asset) => asset.type === "IMAGE").length,
      total: assets.length,
      videos: assets.filter((asset) => asset.type === "VIDEO").length
    };
  }, [assets]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Media</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Shared media library for the dashboard and Studio editor. Assets shown here
            are the same assets loaded into the editor asset manager.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{stats.total} assets</Badge>
          <Badge variant="outline">{stats.images} images</Badge>
          <Badge variant="outline">{stats.videos} videos</Badge>
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                aria-label="Search assets"
                className="pl-9"
                placeholder="Search by filename, hash, or tag"
                value={search}
                onChange={(event) => void setSearch(event.target.value || null)}
              />
            </div>
            <Select
              value={type}
              onValueChange={(value) => void setType(value as AssetType | "all")}
            >
              <SelectTrigger className="sm:w-44" aria-label="Filter assets by type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {assetTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            <Filter className="h-4 w-4" aria-hidden="true" />
            Studio assets use this exact source via `assets.onLoad`.
          </div>
        </CardContent>
      </Card>

      {folders.length ? (
        <div className="flex flex-wrap gap-2">
          {folders.map((folder) => (
            <Badge key={folder} variant="secondary" className="gap-1">
              <FolderOpen className="h-3.5 w-3.5" aria-hidden="true" />
              {folder}
            </Badge>
          ))}
        </div>
      ) : null}

      {assetsQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-56 w-full rounded-2xl" />
          ))}
        </div>
      ) : assetsQuery.isError ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-foreground">Unable to load media</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Check API availability and auth state, then retry.
            </p>
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => void assetsQuery.refetch()}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : assets.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {assets.map((asset) => (
            <button
              key={asset.id}
              className="group overflow-hidden rounded-2xl border bg-card text-left transition-colors hover:border-primary/40 hover:bg-accent/10"
              onClick={() => setSelectedAssetId(asset.id)}
              type="button"
            >
              <AssetPreview asset={asset} />
              <div className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {asset.originalName}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{asset.mimeType}</p>
                  </div>
                  <Badge variant="outline">{formatAssetType(asset.type)}</Badge>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>{formatBytes(asset.size)}</span>
                  {asset.width && asset.height ? (
                    <span>
                      {asset.width} x {asset.height}
                    </span>
                  ) : null}
                </div>
                {asset.tags.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {asset.tags.slice(0, 3).map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="max-w-full truncate"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex min-h-56 flex-col items-center justify-center p-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <Files className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="mt-4 text-sm font-medium text-foreground">No assets found</p>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Adjust the filters or add records into `/api/assets`. The Studio editor will
              surface the same dataset automatically.
            </p>
          </CardContent>
        </Card>
      )}

      <Sheet
        open={Boolean(selectedAsset)}
        onOpenChange={(open) => !open && setSelectedAssetId(null)}
      >
        <SheetContent className="w-full sm:max-w-xl">
          {selectedAsset ? (
            <>
              <SheetHeader>
                <SheetTitle>{selectedAsset.originalName}</SheetTitle>
                <SheetDescription>
                  Shared media record for dashboard browsing and editor asset selection.
                </SheetDescription>
              </SheetHeader>
              <ScrollArea className="mt-6 h-[calc(100vh-10rem)] pr-4">
                <div className="space-y-4">
                  <div className="overflow-hidden rounded-2xl border bg-muted/20">
                    <AssetPreview asset={selectedAsset} expanded />
                  </div>
                  <DetailGrid asset={selectedAsset} />
                </div>
              </ScrollArea>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function AssetPreview({
  asset,
  expanded = false
}: {
  asset: AssetRecord;
  expanded?: boolean;
}) {
  const isImage = asset.type === "IMAGE" && asset.url;
  const isVideo = asset.type === "VIDEO" && asset.url;

  if (isImage) {
    return (
      <div
        className={`relative bg-muted/30 ${expanded ? "aspect-[4/3]" : "aspect-[16/10]"}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt={asset.originalName}
          className="h-full w-full object-cover"
          loading="lazy"
          src={asset.url!}
        />
      </div>
    );
  }

  if (isVideo) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 ${expanded ? "aspect-[4/3]" : "aspect-[16/10]"}`}
      >
        <div className="flex flex-col items-center gap-3 text-white">
          <Video className="h-8 w-8" aria-hidden="true" />
          <span className="text-xs font-medium uppercase tracking-[0.2em]">Video</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800 ${expanded ? "aspect-[4/3]" : "aspect-[16/10]"}`}
    >
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        {asset.type === "DOCUMENT" ? (
          <Files className="h-8 w-8" aria-hidden="true" />
        ) : (
          <ImageIcon className="h-8 w-8" aria-hidden="true" />
        )}
        <span className="text-xs font-medium uppercase tracking-[0.2em]">
          {formatAssetType(asset.type)}
        </span>
      </div>
    </div>
  );
}

function DetailGrid({ asset }: { asset: AssetRecord }) {
  const fields: Array<[string, string]> = [
    ["ID", asset.id],
    ["Type", formatAssetType(asset.type)],
    ["Mime type", asset.mimeType],
    ["Size", formatBytes(asset.size)],
    ["Folder", asset.folder || "Unassigned"],
    ["URL", asset.url || "No public URL"],
    ["Created", formatDate(asset.createdAt)],
    ["Updated", formatDate(asset.updatedAt)]
  ];

  if (asset.width && asset.height) {
    fields.splice(4, 0, ["Dimensions", `${asset.width} x ${asset.height}`]);
  }

  return (
    <div className="grid gap-3">
      {fields.map(([label, value]) => (
        <div key={label} className="rounded-xl border bg-card p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 break-all text-sm text-foreground">{value}</p>
        </div>
      ))}
      {asset.tags.length ? (
        <div className="rounded-xl border bg-card p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Tags
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {asset.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function formatAssetType(type: AssetType) {
  return type.charAt(0) + type.slice(1).toLowerCase();
}

function formatBytes(value: number) {
  if (value < 1024) {
    return `${value} B`;
  }

  const units = ["KB", "MB", "GB"];
  let size = value / 1024;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 100 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

export { MediaLibraryPage };

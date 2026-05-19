"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { ImageIcon, Search } from "lucide-react";

import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  ScrollArea
} from "@workspace/ui";

import AssetDetailSheet from "../media/asset-detail-sheet";
import {
  fetchMedia,
  formatFileSize,
  getAssetThumbnailUrl,
  MEDIA_QUERY_KEYS,
  type MediaAsset
} from "../../lib/api/media";

type LandingProjectAssetsDialogProps = {
  landingId: string;
  onAssetsChanged?: () => Promise<void> | void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

export function LandingProjectAssetsDialog({
  landingId,
  onAssetsChanged,
  onOpenChange,
  open
}: LandingProjectAssetsDialogProps) {
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [detailAsset, setDetailAsset] = React.useState<MediaAsset | null>(null);
  const [detailOpen, setDetailOpen] = React.useState(false);

  React.useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const params = React.useMemo(
    () => ({
      landingId,
      limit: 100,
      page: 1,
      search: debouncedSearch || undefined,
      sortBy: "createdAt" as const,
      sortOrder: "desc" as const
    }),
    [debouncedSearch, landingId]
  );

  const assetsQuery = useQuery({
    queryKey: MEDIA_QUERY_KEYS.list(params),
    queryFn: () => fetchMedia(params),
    enabled: open
  });

  const assets = assetsQuery.data?.items ?? [];
  const visibleCount = assets.filter((asset) => !asset.isMuted).length;

  const refresh = React.useCallback(async () => {
    await assetsQuery.refetch();
    await onAssetsChanged?.();
  }, [assetsQuery, onAssetsChanged]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl p-0">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle className="flex items-center justify-between gap-4">
              <span>Project assets</span>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{assets.length} total</Badge>
                <Badge variant="outline">{visibleCount} visible in picker</Badge>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="border-b px-6 py-4">
            <div className="relative max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search project assets"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>
          <ScrollArea className="h-[70vh] px-6 py-5">
            {assetsQuery.isLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-56 animate-pulse rounded-2xl border bg-muted/30"
                  />
                ))}
              </div>
            ) : assets.length ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {assets.map((asset) => {
                  const thumb = getAssetThumbnailUrl(asset);
                  return (
                    <button
                      key={asset.id}
                      className="overflow-hidden rounded-2xl border bg-card text-left transition-colors hover:border-primary/40 hover:bg-accent/10"
                      onClick={() => {
                        setDetailAsset(asset);
                        setDetailOpen(true);
                      }}
                      type="button"
                    >
                      <div className="relative aspect-[16/10] bg-muted/30">
                        {thumb ? (
                          // eslint-disable-next-line @next/next/no-img-element -- dynamic storage URL
                          <img
                            alt={asset.originalName}
                            className="h-full w-full object-cover"
                            loading="lazy"
                            src={thumb}
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-muted-foreground">
                            <ImageIcon className="h-8 w-8" />
                          </div>
                        )}
                        {asset.isMuted ? (
                          <div className="absolute right-3 top-3 rounded-full bg-background/90 px-2 py-1 text-[11px] font-medium text-muted-foreground shadow-sm">
                            Muted
                          </div>
                        ) : null}
                      </div>
                      <div className="space-y-2 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">
                              {asset.originalName}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {asset.mimeType}
                            </p>
                          </div>
                          <Badge variant="outline">{asset.type}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span>{formatFileSize(asset.size)}</span>
                          {asset.width && asset.height ? (
                            <span>
                              {asset.width} x {asset.height}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex min-h-[18rem] flex-col items-center justify-center gap-3 text-center text-muted-foreground">
                <ImageIcon className="h-10 w-10" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    No project assets found
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Assets linked to this landing will appear here.
                  </p>
                </div>
              </div>
            )}
          </ScrollArea>
          <div className="border-t px-6 py-4">
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AssetDetailSheet
        asset={detailAsset}
        open={detailOpen}
        onDeleted={async () => {
          setDetailAsset(null);
          await refresh();
        }}
        onOpenChange={setDetailOpen}
        onUpdated={async (updatedAsset) => {
          setDetailAsset(updatedAsset);
          await refresh();
        }}
      />
    </>
  );
}

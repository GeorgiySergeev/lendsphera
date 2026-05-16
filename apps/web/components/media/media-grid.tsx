"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  File,
  FileText,
  Film,
  FolderInput,
  Grid,
  Image,
  List,
  Package,
  Search,
  Trash2,
  Type
} from "lucide-react";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Input } from "@workspace/ui/components/input";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@workspace/ui/components/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@workspace/ui/components/alert-dialog";
import { cn } from "@workspace/ui/lib/utils";

import {
  deleteAssets,
  fetchFolders,
  fetchMedia,
  formatFileSize,
  getAssetThumbnailUrl,
  MEDIA_QUERY_KEYS,
  moveAssets,
  type AssetType,
  type MediaAsset
} from "../../lib/api/media";
import { useMediaStore } from "../../stores/media-store";

/* ───── helpers ───── */

const typeIconMap: Record<AssetType, React.ReactNode> = {
  IMAGE: <Image className="h-6 w-6 text-blue-500" />,
  VIDEO: <Film className="h-6 w-6 text-red-500" />,
  DOCUMENT: <FileText className="h-6 w-6 text-orange-500" />,
  FONT: <Type className="h-6 w-6 text-purple-500" />,
  ARCHIVE: <Package className="h-6 w-6 text-gray-500" />,
  OTHER: <File className="h-6 w-6 text-gray-400" />
};

const sortOptions = [
  { label: "Newest", sortBy: "createdAt" as const, sortOrder: "desc" as const },
  { label: "Oldest", sortBy: "createdAt" as const, sortOrder: "asc" as const },
  { label: "Name", sortBy: "name" as const, sortOrder: "asc" as const },
  { label: "Size", sortBy: "size" as const, sortOrder: "desc" as const }
];

/* ───── AssetCard (grid) ───── */

function AssetCard({
  asset,
  selected,
  onToggle,
  onDoubleClick
}: {
  asset: MediaAsset;
  selected: boolean;
  onToggle: () => void;
  onDoubleClick?: () => void;
}) {
  const thumb = getAssetThumbnailUrl(asset);
  const Icon = typeIconMap[asset.type];

  return (
    <div
      className={cn(
        "group relative cursor-pointer rounded-lg border-2 transition-all overflow-hidden",
        selected
          ? "border-primary ring-2 ring-primary/20"
          : "border-transparent hover:border-border"
      )}
      onClick={onToggle}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClick?.();
      }}
    >
      {/* thumbnail area */}
      <div className="aspect-square bg-muted flex items-center justify-center relative">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element -- dynamic storage URL
          <img
            src={thumb}
            alt={asset.originalName}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted-foreground">
            {Icon}
            <span className="text-[10px] uppercase tracking-wide">{asset.type}</span>
          </div>
        )}

        {/* checkbox overlay */}
        <div
          className={cn(
            "absolute top-2 left-2 transition-opacity",
            selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox checked={selected} />
        </div>

        {/* selected checkmark */}
        {selected && (
          <div className="absolute inset-0 bg-primary/10 flex items-center justify-center pointer-events-none">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
        )}
      </div>

      {/* bottom bar */}
      <div className="px-2 py-1.5 bg-background">
        <p className="text-xs truncate font-medium" title={asset.originalName}>
          {asset.originalName}
        </p>
        <p className="text-[10px] text-muted-foreground">{formatFileSize(asset.size)}</p>
      </div>
    </div>
  );
}

/* ───── MediaGrid ───── */

export default function MediaGrid({
  onAssetDoubleClick
}: {
  onAssetDoubleClick?: (asset: MediaAsset) => void;
}) {
  const queryClient = useQueryClient();
  const {
    currentFolderId,
    selectedAssetIds,
    viewMode,
    toggleAsset,
    selectAll,
    clearSelection,
    setViewMode
  } = useMediaStore();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<AssetType | "all">("all");
  const [sortValue, setSortValue] = useState("Newest");
  const [page, setPage] = useState(1);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  /* debounce search */
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const sort = useMemo(
    () => sortOptions.find((s) => s.label === sortValue) ?? sortOptions[0],
    [sortValue]
  );

  const params = useMemo(
    () => ({
      folderId: currentFolderId,
      type: typeFilter === "all" ? undefined : typeFilter,
      search: debouncedSearch || undefined,
      page,
      limit: 40,
      sortBy: sort.sortBy,
      sortOrder: sort.sortOrder
    }),
    [currentFolderId, typeFilter, debouncedSearch, page, sort]
  );

  const { data, isLoading } = useQuery({
    queryKey: MEDIA_QUERY_KEYS.list(params),
    queryFn: () => fetchMedia(params)
  });

  const items = data?.items ?? [];
  const meta = data?.meta;

  /* folder list for move dropdown */
  const { data: allFolders } = useQuery({
    queryKey: MEDIA_QUERY_KEYS.folders(null),
    queryFn: () => fetchFolders(null),
    enabled: selectedAssetIds.size > 0
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteAssets(Array.from(selectedAssetIds)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media", "list"] });
      clearSelection();
      setShowDeleteDialog(false);
    }
  });

  const moveMutation = useMutation({
    mutationFn: (folderId: string | null) =>
      moveAssets(Array.from(selectedAssetIds), folderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media", "list"] });
      clearSelection();
    }
  });

  const allSelected = items.length > 0 && items.every((i) => selectedAssetIds.has(i.id));

  /* reset page when folder or filter changes */
  useEffect(() => {
    setPage(1);
  }, [currentFolderId, typeFilter, debouncedSearch, sortValue]);

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* ─── toolbar ─── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>

        <Select
          value={typeFilter}
          onValueChange={(v) => setTypeFilter(v as AssetType | "all")}
        >
          <SelectTrigger className="w-[130px] h-9 text-xs">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="IMAGE">Image</SelectItem>
            <SelectItem value="VIDEO">Video</SelectItem>
            <SelectItem value="DOCUMENT">Document</SelectItem>
            <SelectItem value="FONT">Font</SelectItem>
            <SelectItem value="ARCHIVE">Archive</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortValue} onValueChange={setSortValue}>
          <SelectTrigger className="w-[130px] h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((s) => (
              <SelectItem key={s.label} value={s.label}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center border rounded-md overflow-hidden">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon"
            className="h-9 w-9 rounded-none"
            onClick={() => setViewMode("grid")}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="icon"
            className="h-9 w-9 rounded-none"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ─── bulk action bar ─── */}
      {selectedAssetIds.size > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-accent/50 rounded-md">
          <Badge variant="secondary">{selectedAssetIds.size} selected</Badge>

          <Select onValueChange={(v) => moveMutation.mutate(v === "__root__" ? null : v)}>
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <FolderInput className="h-3.5 w-3.5 mr-1" />
              Move to...
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__root__">📁 Root</SelectItem>
              {allFolders?.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="default"
            size="sm"
            className="h-8 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Delete
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs ml-auto"
            onClick={clearSelection}
          >
            Clear
          </Button>
        </div>
      )}

      {/* ─── content ─── */}
      {isLoading ? (
        viewMode === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="aspect-square w-full rounded-lg" />
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-2 w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        )
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-3 text-muted-foreground py-12">
          <Image className="h-12 w-12 opacity-50" />
          <p className="text-sm">No files here yet</p>
          <p className="text-xs">Upload files to get started</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
          {items.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              selected={selectedAssetIds.has(asset.id)}
              onToggle={() => toggleAsset(asset.id)}
              onDoubleClick={() => onAssetDoubleClick?.(asset)}
            />
          ))}
        </div>
      ) : (
        <div className="border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="w-10 px-3 py-2">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={(checked) =>
                      checked ? selectAll(items.map((i) => i.id)) : clearSelection()
                    }
                  />
                </th>
                <th className="w-12 px-2 py-2" />
                <th className="px-3 py-2 text-left font-medium">Name</th>
                <th className="px-3 py-2 text-left font-medium">Type</th>
                <th className="px-3 py-2 text-left font-medium">Size</th>
                <th className="px-3 py-2 text-left font-medium">Uploaded</th>
                <th className="px-3 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((asset) => (
                <tr
                  key={asset.id}
                  className={cn(
                    "border-t transition-colors hover:bg-accent/30 cursor-pointer",
                    selectedAssetIds.has(asset.id) && "bg-accent/20"
                  )}
                  onDoubleClick={() => onAssetDoubleClick?.(asset)}
                >
                  <td className="px-3 py-2">
                    <Checkbox
                      checked={selectedAssetIds.has(asset.id)}
                      onCheckedChange={() => toggleAsset(asset.id)}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <div className="h-10 w-10 rounded bg-muted flex items-center justify-center overflow-hidden">
                      {getAssetThumbnailUrl(asset) ? (
                        // eslint-disable-next-line @next/next/no-img-element -- dynamic storage URL
                        <img
                          src={getAssetThumbnailUrl(asset)!}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        typeIconMap[asset.type]
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 font-medium truncate max-w-[200px]">
                    {asset.originalName}
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant="outline" className="text-[10px]">
                      {asset.type}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {formatFileSize(asset.size)}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground text-xs">
                    {new Date(asset.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => {
                        selectAll([asset.id]);
                        setShowDeleteDialog(true);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── pagination ─── */}
      {meta && meta.pageCount > 1 && (
        <div className="flex items-center justify-between py-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {meta.page} of {meta.pageCount} ({meta.total} total)
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= meta.pageCount}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {/* ─── delete confirm ─── */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete selected files?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedAssetIds.size} file(s). This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

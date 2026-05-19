"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Copy,
  Download,
  ExternalLink,
  EyeOff,
  PencilLine,
  Tag,
  Trash2,
  X
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@workspace/ui/components/dialog";
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
import { Separator } from "@workspace/ui/components/separator";
import { cn } from "@workspace/ui/lib/utils";

import {
  deleteAssets,
  downloadAsset,
  formatFileSize,
  getAssetThumbnailUrl,
  updateAsset,
  type AssetType,
  type MediaAsset
} from "../../lib/api/media";

type AssetDetailSheetProps = {
  asset: MediaAsset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
  onUpdated?: (asset: MediaAsset) => void;
};

const typeLabel: Record<AssetType, string> = {
  IMAGE: "Image",
  VIDEO: "Video",
  DOCUMENT: "Document",
  FONT: "Font",
  ARCHIVE: "Archive",
  OTHER: "Other"
};

const typeIconColor: Record<AssetType, string> = {
  IMAGE: "text-blue-500",
  VIDEO: "text-red-500",
  DOCUMENT: "text-orange-500",
  FONT: "text-purple-500",
  ARCHIVE: "text-gray-500",
  OTHER: "text-gray-400"
};

export default function AssetDetailSheet({
  asset,
  open,
  onOpenChange,
  onDeleted,
  onUpdated
}: AssetDetailSheetProps) {
  const [draftName, setDraftName] = useState("");
  const [localTags, setLocalTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateMutation = useMutation({
    mutationFn: (tags: string[]) => updateAsset(asset!.id, { tags }),
    onSuccess: () => {
      // silent save
    },
    onError: () => {
      toast.error("Failed to save tags");
    }
  });

  const detailsMutation = useMutation({
    mutationFn: (payload: { isMuted?: boolean; originalName?: string }) =>
      updateAsset(asset!.id, payload),
    onSuccess: (updatedAsset) => {
      setDraftName(updatedAsset.originalName);
      onUpdated?.(updatedAsset);
      toast.success("Asset updated");
    },
    onError: () => {
      toast.error("Failed to update asset");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteAssets([asset!.id]),
    onSuccess: () => {
      toast.success("Asset deleted");
      onDeleted();
      onOpenChange(false);
      setShowDeleteDialog(false);
    }
  });

  /* sync local tags when asset changes */
  useEffect(() => {
    if (asset) {
      setDraftName(asset.originalName);
      setLocalTags(asset.tags);
    }
  }, [asset?.id]);

  /* auto-save tags after 500ms of inactivity */
  const scheduleSave = useCallback(
    (tags: string[]) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        updateMutation.mutate(tags);
      }, 500);
    },
    [updateMutation]
  );

  const addTag = useCallback(
    (raw: string) => {
      const tag = raw.trim().toLowerCase();
      if (!tag || localTags.includes(tag)) return;
      const next = [...localTags, tag];
      setLocalTags(next);
      scheduleSave(next);
    },
    [localTags, scheduleSave]
  );

  const removeTag = useCallback(
    (tag: string) => {
      const next = localTags.filter((t) => t !== tag);
      setLocalTags(next);
      scheduleSave(next);
    },
    [localTags, scheduleSave]
  );

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (tagInput.trim()) {
        addTag(tagInput);
        setTagInput("");
      }
    }
    if (e.key === "Backspace" && !tagInput && localTags.length > 0) {
      removeTag(localTags[localTags.length - 1]);
    }
  };

  const handleCopyUrl = async () => {
    if (!asset?.url) return;
    try {
      await navigator.clipboard.writeText(asset.url);
      toast.success("URL copied!");
    } catch {
      toast.error("Failed to copy URL");
    }
  };

  const handleDownload = async () => {
    if (!asset) return;
    try {
      await downloadAsset(asset);
    } catch {
      toast.error("Download failed");
    }
  };

  const handleOpenInTab = () => {
    if (!asset?.url) return;
    window.open(asset.url, "_blank", "noopener,noreferrer");
  };

  if (!asset) return null;

  const thumb = getAssetThumbnailUrl(asset);
  const dimensions =
    asset.width && asset.height ? `${asset.width} × ${asset.height}` : null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={cn(
            "fixed right-0 top-0 h-full w-full max-w-[400px] translate-x-0 translate-y-0",
            "left-auto border-r-0 rounded-r-none p-0 gap-0 overflow-hidden flex flex-col"
          )}
        >
          {/* header */}
          <DialogHeader className="px-5 py-4 border-b shrink-0">
            <DialogTitle className="flex items-center justify-between text-base font-semibold">
              <span className="truncate pr-4" title={asset.originalName}>
                {asset.originalName}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>

          {/* scrollable body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
            {/* preview */}
            <div className="flex items-center justify-center bg-muted rounded-lg overflow-hidden min-h-[200px]">
              {thumb ? (
                // eslint-disable-next-line @next/next/no-img-element -- dynamic storage URL
                <img
                  src={thumb}
                  alt={asset.originalName}
                  className="max-h-[280px] w-auto object-contain"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                  <Tag className={cn("h-12 w-12", typeIconColor[asset.type])} />
                  <span className="text-xs uppercase tracking-wider">
                    {typeLabel[asset.type]}
                  </span>
                </div>
              )}
            </div>

            {/* details */}
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type</span>
                <span className="font-medium">{typeLabel[asset.type]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Size</span>
                <span className="font-medium">{formatFileSize(asset.size)}</span>
              </div>
              {dimensions && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dimensions</span>
                  <span className="font-medium">{dimensions}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Uploaded</span>
                <span className="font-medium">
                  {new Date(asset.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">By</span>
                <span className="font-medium">
                  {asset.uploader.name ?? asset.uploader.email}
                </span>
              </div>
            </div>

            <Separator />

            {/* url */}
            <div className="space-y-2">
              <span className="text-sm font-medium">URL</span>
              <div className="flex gap-2">
                <Input value={asset.url ?? ""} readOnly className="text-xs h-9" />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={handleCopyUrl}
                  disabled={!asset.url}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs h-8"
                onClick={handleOpenInTab}
                disabled={!asset.url}
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                Open in new tab
              </Button>
            </div>

            <Separator />

            <div className="space-y-2">
              <span className="text-sm font-medium">Name</span>
              <div className="flex gap-2">
                <Input
                  value={draftName}
                  onChange={(event) => setDraftName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      const nextName = draftName.trim();
                      if (nextName && nextName !== asset.originalName) {
                        detailsMutation.mutate({ originalName: nextName });
                      }
                    }
                  }}
                  className="h-9 text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  disabled={
                    !draftName.trim() ||
                    draftName.trim() === asset.originalName ||
                    detailsMutation.isPending
                  }
                  onClick={() =>
                    detailsMutation.mutate({ originalName: draftName.trim() })
                  }
                >
                  <PencilLine className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {asset.landingId ? (
              <>
                <Separator />
                <div className="space-y-2">
                  <span className="text-sm font-medium">Project asset visibility</span>
                  <Button
                    variant={asset.isMuted ? "secondary" : "outline"}
                    className="w-full justify-start gap-2 text-xs"
                    disabled={detailsMutation.isPending}
                    onClick={() => detailsMutation.mutate({ isMuted: !asset.isMuted })}
                  >
                    <EyeOff className="h-3.5 w-3.5" />
                    {asset.isMuted ? "Muted in picker" : "Mute in picker"}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Muted assets stay attached to the landing but are hidden from Studio
                    `Project assets`.
                  </p>
                </div>
              </>
            ) : null}

            {/* tags */}
            <div className="space-y-2">
              <span className="text-sm font-medium">Tags</span>
              <div className="flex flex-wrap gap-1.5">
                {localTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="gap-1 text-xs cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => removeTag(tag)}
                  >
                    {tag}
                    <X className="h-2.5 w-2.5" />
                  </Badge>
                ))}
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  onBlur={() => {
                    if (tagInput.trim()) {
                      addTag(tagInput);
                      setTagInput("");
                    }
                    // also flush any pending save
                    if (saveTimerRef.current) {
                      clearTimeout(saveTimerRef.current);
                      updateMutation.mutate(localTags);
                    }
                  }}
                  placeholder="Add tag..."
                  className="h-7 text-xs flex-1 min-w-[100px]"
                />
              </div>
            </div>
          </div>

          {/* footer actions */}
          <div className="px-5 py-4 border-t shrink-0 flex gap-2">
            <Button
              variant="outline"
              className="flex-1 h-9 text-xs"
              onClick={handleDownload}
              disabled={!asset.url}
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Download
            </Button>
            <Button
              variant="default"
              className="flex-1 h-9 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* delete confirm */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this file?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{asset.originalName}". This action cannot be
              undone.
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
    </>
  );
}

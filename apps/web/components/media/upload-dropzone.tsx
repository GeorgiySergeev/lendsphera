"use client";

import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CloudUpload, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";

import { uploadFiles } from "../../lib/api/media";
import { useMediaStore } from "../../stores/media-store";

const ACCEPT_TYPES = [
  "image/*",
  "video/*",
  "font/*",
  ".pdf",
  ".zip",
  ".tar",
  ".gz",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot"
].join(",");

export type UploadDropzoneHandle = {
  trigger: () => void;
};

const UploadDropzone = forwardRef<UploadDropzoneHandle>(
  function UploadDropzone(_props, ref) {
    const queryClient = useQueryClient();
    const { currentFolderId, setUploadProgress, setDraggingOver } = useMediaStore();

    const inputRef = useRef<HTMLInputElement>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [uploadPercent, setUploadPercent] = useState(0);
    const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "done">(
      "idle"
    );
    const [doneCount, setDoneCount] = useState(0);

    useImperativeHandle(ref, () => ({
      trigger: () => inputRef.current?.click()
    }));

    const uploadMutation = useMutation({
      mutationFn: async (files: File[]) => {
        setUploadStatus("uploading");
        setUploadProgress(0);

        const result = await uploadFiles(files, currentFolderId, (pct) => {
          setUploadPercent(pct);
          setUploadProgress(pct);
        });

        return { count: result.length };
      },
      onSuccess: ({ count }) => {
        setUploadStatus("done");
        setDoneCount(count);
        setUploadProgress(null);
        toast.success(`Uploaded ${count} file${count === 1 ? "" : "s"}`);
        queryClient.invalidateQueries({ queryKey: ["media", "list"] });

        setTimeout(() => {
          setUploadStatus("idle");
          setUploadPercent(0);
        }, 2000);
      },
      onError: (error: Error) => {
        setUploadStatus("idle");
        setUploadProgress(null);
        toast.error(error.message || "Upload failed");
      }
    });

    const handleFiles = useCallback(
      (files: FileList | null) => {
        if (!files || files.length === 0) return;
        uploadMutation.mutate(Array.from(files));
      },
      [uploadMutation]
    );

    const handleDragOver = useCallback(
      (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isDragOver) setIsDragOver(true);
        setDraggingOver(true);
      },
      [isDragOver, setDraggingOver]
    );

    const handleDragLeave = useCallback(
      (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        setDraggingOver(false);
      },
      [setDraggingOver]
    );

    const handleDrop = useCallback(
      (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        setDraggingOver(false);
        handleFiles(e.dataTransfer.files);
      },
      [handleFiles, setDraggingOver]
    );

    const handleClick = () => {
      inputRef.current?.click();
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFiles(e.target.files);
      // reset input so same files can be re-selected
      e.target.value = "";
    };

    return (
      <div
        className={cn(
          "relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-all",
          isDragOver
            ? "border-primary bg-primary/5 scale-[1.01]"
            : "border-border bg-muted/30 hover:bg-muted/50"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT_TYPES}
          className="hidden"
          onChange={handleInputChange}
        />

        {/* icon */}
        <div
          className={cn(
            "transition-transform duration-200",
            isDragOver ? "scale-110" : "scale-100"
          )}
        >
          {uploadStatus === "done" ? (
            <CheckCircle2 className="h-10 w-10 text-green-500" />
          ) : (
            <CloudUpload
              className={cn(
                "h-10 w-10 transition-colors",
                isDragOver ? "text-primary" : "text-muted-foreground"
              )}
            />
          )}
        </div>

        {/* text */}
        <div className="space-y-1">
          {uploadStatus === "uploading" ? (
            <>
              <p className="text-sm font-medium">Uploading {doneCount} file(s)...</p>
              <p className="text-xs text-muted-foreground">{uploadPercent}%</p>
            </>
          ) : uploadStatus === "done" ? (
            <>
              <p className="text-sm font-medium text-green-600">
                Uploaded {doneCount} file{doneCount === 1 ? "" : "s"}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium">Drop files here or click to browse</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                Max 50 MB per file · Images, Videos, Fonts, PDF, ZIP
              </p>
            </>
          )}
        </div>

        {/* progress bar */}
        {uploadStatus === "uploading" && (
          <div className="w-full max-w-xs bg-muted rounded-full h-2 overflow-hidden">
            <div
              className="bg-primary h-full rounded-full transition-all duration-200"
              style={{ width: `${uploadPercent}%` }}
            />
          </div>
        )}

        {/* click-to-browse button (visible on idle) */}
        {uploadStatus === "idle" && (
          <Button
            variant="outline"
            size="sm"
            className="mt-1 h-8 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              handleClick();
            }}
          >
            Browse files
          </Button>
        )}
      </div>
    );
  }
);

export default UploadDropzone;

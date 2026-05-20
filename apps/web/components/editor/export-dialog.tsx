"use client";

import { Download, FileArchive, Loader2 } from "lucide-react";
import * as React from "react";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@workspace/ui";

import { exportLandingZip } from "../../lib/export/export-zip";

type ExportDialogProps = {
  getHtml: () => string;
  getCss: () => string;
  getJs?: () => string;
  name?: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ExportDialog({
  getHtml,
  getCss,
  getJs,
  name,
  isOpen,
  onOpenChange
}: ExportDialogProps) {
  const [progress, setProgress] = React.useState(0);
  const [progressMessage, setProgressMessage] = React.useState("");
  const [isExporting, setIsExporting] = React.useState(false);
  const abortRef = React.useRef<AbortController | null>(null);

  const handleExport = React.useCallback(async () => {
    setIsExporting(true);
    setProgress(0);
    setProgressMessage("Starting...");

    const abortController = new AbortController();
    abortRef.current = abortController;

    try {
      await exportLandingZip({
        html: getHtml(),
        css: getCss(),
        js: getJs?.(),
        name,
        onProgress: (message, percent) => {
          setProgressMessage(message);
          setProgress(percent);
        },
        abortSignal: abortController.signal
      });

      if (!abortController.signal.aborted) {
        setProgressMessage("Export complete!");
        setTimeout(() => {
          onOpenChange(false);
          setProgress(0);
          setProgressMessage("");
        }, 1500);
      }
    } catch {
      if (!abortController.signal.aborted) {
        setProgressMessage("Export failed");
      }
    } finally {
      if (!abortController.signal.aborted) {
        setIsExporting(false);
      }
      abortRef.current = null;
    }
  }, [getHtml, getCss, getJs, name, onOpenChange]);

  const handleCancel = React.useCallback(() => {
    abortRef.current?.abort();
    setIsExporting(false);
    setProgress(0);
    setProgressMessage("");
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileArchive className="h-5 w-5" />
            Export landing
          </DialogTitle>
          <DialogDescription>
            Download a ZIP archive with all site files. HTML/CSS/JS will be minified,
            images converted to WebP.
          </DialogDescription>
        </DialogHeader>

        {isExporting ? (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">{progressMessage}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3 py-2 text-sm text-muted-foreground">
            <p>The ZIP will contain:</p>
            <ul className="ml-5 list-disc space-y-1">
              <li>
                Minified <strong>index.html</strong>
              </li>
              <li>
                Minified <strong>styles.css</strong>
              </li>
              {getJs ? (
                <li>
                  Minified <strong>script.js</strong>
                </li>
              ) : null}
              <li>
                Images converted to <strong>WebP</strong> format
              </li>
            </ul>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {isExporting ? (
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleExport}>
                <Download className="h-4 w-4" />
                Export ZIP
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

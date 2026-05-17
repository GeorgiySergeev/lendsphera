"use client";

import * as React from "react";
import { Monitor, Smartphone, Tablet } from "lucide-react";

import { Button } from "@workspace/ui";

type PreviewDevice = "desktop" | "mobile" | "tablet";

type PreviewPaneProps = {
  iframeUrl: string;
  isLoading: boolean;
  onRefresh: () => void;
};

const previewDeviceWidth: Record<PreviewDevice, string> = {
  mobile: "390px",
  tablet: "820px",
  desktop: "100%"
};

function PreviewPane({ iframeUrl, isLoading, onRefresh }: PreviewPaneProps) {
  const [device, setDevice] = React.useState<PreviewDevice>("desktop");

  return (
    <div className="flex h-full min-h-[70vh] flex-col gap-3 p-3">
      <div className="flex items-center justify-between gap-2 rounded-md border bg-background/80 px-3 py-2">
        <div className="flex items-center gap-1">
          <Button
            onClick={() => setDevice("mobile")}
            size="sm"
            variant={device === "mobile" ? "secondary" : "ghost"}
          >
            <Smartphone className="mr-1 h-4 w-4" />
            Mobile
          </Button>
          <Button
            onClick={() => setDevice("tablet")}
            size="sm"
            variant={device === "tablet" ? "secondary" : "ghost"}
          >
            <Tablet className="mr-1 h-4 w-4" />
            Tablet
          </Button>
          <Button
            onClick={() => setDevice("desktop")}
            size="sm"
            variant={device === "desktop" ? "secondary" : "ghost"}
          >
            <Monitor className="mr-1 h-4 w-4" />
            Desktop
          </Button>
        </div>
        <Button onClick={onRefresh} size="sm" variant="outline">
          Refresh from draft
        </Button>
      </div>
      <div className="flex-1 overflow-auto rounded-lg border bg-slate-950/95 p-3">
        <div
          className="mx-auto h-full transition-[width] duration-200"
          style={{ width: previewDeviceWidth[device] }}
        >
          <iframe
            className="h-[70vh] w-full rounded-md bg-white"
            src={iframeUrl}
            title="Landing preview"
          />
        </div>
      </div>
      {isLoading ? (
        <p className="text-xs text-muted-foreground">Syncing latest draft...</p>
      ) : null}
    </div>
  );
}

export { PreviewPane };

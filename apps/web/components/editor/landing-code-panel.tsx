"use client";

import type { EditorProps, OnMount } from "@monaco-editor/react";
import dynamic from "next/dynamic";
import * as React from "react";

import { Badge, Button, Skeleton, cn } from "@workspace/ui";

const MonacoEditor = dynamic<EditorProps>(() => import("@monaco-editor/react"), {
  loading: () => <Skeleton className="h-[360px] w-full" />,
  ssr: false
});

type CodePanelTab = "html" | "css";

type LandingCodePanelProps = {
  cssError: string | null;
  customCss: string;
  html: string;
  onCustomCssChange: (value: string) => void;
};

const editorOptions = {
  automaticLayout: true,
  fontSize: 12,
  lineNumbersMinChars: 3,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  wordWrap: "on"
} as const;

function LandingCodePanel({
  cssError,
  customCss,
  html,
  onCustomCssChange
}: LandingCodePanelProps) {
  const [activeTab, setActiveTab] = React.useState<CodePanelTab>("html");
  const handleMount = React.useCallback<OnMount>((_editor, monaco) => {
    void setupTailwindIntelliSense(monaco);
  }, []);

  return (
    <div className="space-y-3">
      <div
        className="grid grid-cols-2 gap-1 rounded-lg border bg-muted/40 p-1"
        role="tablist"
        aria-label="Code editor tabs"
      >
        <Button
          aria-selected={activeTab === "html"}
          className={cn("h-8 text-xs", activeTab === "html" && "bg-background shadow-sm")}
          onClick={() => setActiveTab("html")}
          role="tab"
          type="button"
          variant="ghost"
        >
          HTML
        </Button>
        <Button
          aria-selected={activeTab === "css"}
          className={cn("h-8 text-xs", activeTab === "css" && "bg-background shadow-sm")}
          onClick={() => setActiveTab("css")}
          role="tab"
          type="button"
          variant="ghost"
        >
          Custom CSS
        </Button>
      </div>
      <div className={cn(activeTab !== "html" && "hidden")} role="tabpanel">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-muted-foreground">Rendered HTML</span>
          <Badge variant="secondary">Read only</Badge>
        </div>
        <div className="overflow-hidden rounded-lg border">
          <MonacoEditor
            height="360px"
            language="html"
            onMount={handleMount}
            options={{ ...editorOptions, readOnly: true }}
            path="landing.html"
            theme="vs-dark"
            value={html}
          />
        </div>
      </div>
      <div className={cn(activeTab !== "css" && "hidden")} role="tabpanel">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            Global custom CSS
          </span>
          <Badge variant={cssError ? "outline" : "secondary"}>
            {cssError ? "Invalid" : "Valid"}
          </Badge>
        </div>
        <div className="overflow-hidden rounded-lg border">
          <MonacoEditor
            height="360px"
            language="css"
            onChange={(value: string | undefined) => onCustomCssChange(value ?? "")}
            onMount={handleMount}
            options={editorOptions}
            path="landing.custom.css"
            theme="vs-dark"
            value={customCss}
          />
        </div>
        <p
          className={cn(
            "mt-2 text-xs",
            cssError ? "text-destructive" : "text-muted-foreground"
          )}
        >
          {cssError ??
            "CSS is automatically scoped under .landing-root before it is applied."}
        </p>
      </div>
    </div>
  );
}

async function setupTailwindIntelliSense(monaco: unknown) {
  try {
    const tailwindModule = await import("monaco-tailwindcss");
    const candidates = Object.values(tailwindModule) as unknown[];

    for (const candidate of candidates) {
      if (typeof candidate === "function") {
        candidate(monaco);
        return;
      }
    }
  } catch {
    return;
  }
}

export { LandingCodePanel };

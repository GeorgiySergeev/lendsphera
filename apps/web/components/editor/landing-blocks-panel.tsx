"use client";

import * as React from "react";
import type { EditorLike } from "../../lib/editor/landing-editor-adapter";
import type { BlockDescriptor } from "../../lib/editor/landing-editor-adapter";
import { insertHtmlAtSelection } from "../../lib/editor/landing-editor-adapter";
import { cn, Button } from "@workspace/ui";

type LandingBlocksPanelProps = {
  blocks: BlockDescriptor[];
  editor: EditorLike | null;
  onDirty: () => void;
};

function LandingBlocksPanel({ blocks, editor, onDirty }: LandingBlocksPanelProps) {
  const [containerRef, compact] = useCompactBlocksMode<HTMLDivElement>();
  const handleInsert = React.useCallback(
    (block: BlockDescriptor) => {
      if (!editor) {
        return;
      }

      const inserted = insertHtmlAtSelection(editor, block.content);
      if (inserted) {
        onDirty();
      }
    },
    [editor, onDirty]
  );

  const handleDragStart = React.useCallback(
    (event: React.DragEvent, block: BlockDescriptor) => {
      event.dataTransfer.setData(
        "application/x-landing-block",
        JSON.stringify({ type: "landing-block", html: block.content, id: block.id })
      );
      event.dataTransfer.effectAllowed = "copy";
    },
    []
  );

  return (
    <div ref={containerRef} className="space-y-3">
      <div className="flex items-center justify-between border-b px-1 pb-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/70">
            Basic
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Click to add or drag into the canvas
          </p>
        </div>
      </div>
      <div
        className="grid gap-2"
        style={{
          gridTemplateColumns: compact
            ? "repeat(auto-fit, minmax(72px, 1fr))"
            : "repeat(auto-fit, minmax(96px, 1fr))"
        }}
      >
        {blocks.map((block) => {
          const Icon = block.icon;

          return (
            <Button
              key={block.id}
              type="button"
              variant="ghost"
              draggable
              onDragStart={(event) => handleDragStart(event, block)}
              onClick={() => handleInsert(block)}
              className={cn(
                "group h-auto min-h-24 flex-col gap-3 rounded-xl border border-border/70 bg-card px-3 py-4 text-center shadow-sm",
                "hover:border-primary/40 hover:bg-accent/60 hover:text-accent-foreground",
                compact && "min-h-20 gap-2 px-2 py-3"
              )}
            >
              <span
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full border border-border/80 bg-background",
                  compact && "h-8 w-8"
                )}
              >
                <Icon
                  className={cn("h-5 w-5 text-muted-foreground", compact && "h-4 w-4")}
                  strokeWidth={1.2}
                />
              </span>
              <span
                className={cn(
                  "text-[11px] font-medium leading-4",
                  compact && "text-[10px] leading-3.5"
                )}
              >
                {block.label}
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}

function useCompactBlocksMode<T extends HTMLElement>() {
  const ref = React.useRef<T | null>(null);
  const [compact, setCompact] = React.useState(false);

  React.useEffect(() => {
    if (!ref.current || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      setCompact(entry.contentRect.width < 220);
    });

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return [ref, compact] as const;
}

export { LandingBlocksPanel };

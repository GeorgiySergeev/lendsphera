"use client";

import * as React from "react";
import { Badge, Input } from "@workspace/ui";

type SelectedComponentLike = {
  addAttributes?: (attributes: Record<string, string>) => void;
  components?: (content?: string) => unknown;
  get?: (key: string) => unknown;
  getAttributes?: () => Record<string, unknown>;
  set?: (key: string | Record<string, unknown>, value?: unknown) => void;
};

type LandingContentPanelProps = {
  component: SelectedComponentLike | null;
  onDirty: () => void;
};

function LandingContentPanel({ component, onDirty }: LandingContentPanelProps) {
  const [draftContent, setDraftContent] = React.useState("");
  const tagName = React.useMemo(() => {
    const raw = component?.get?.("tagName");
    return typeof raw === "string" ? raw.toLowerCase() : null;
  }, [component]);
  const attributes = React.useMemo(
    () => (component?.getAttributes?.() ?? {}) as Record<string, unknown>,
    [component]
  );

  React.useEffect(() => {
    if (!component) {
      setDraftContent("");
      return;
    }

    const content = component.get?.("content");
    setDraftContent(typeof content === "string" ? content : "");
  }, [component]);

  if (!component) {
    return (
      <div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
        Select a component on the canvas to edit its copy and essential attributes.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-background p-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Selected element</h3>
            <p className="text-xs text-muted-foreground">
              Quick content controls for the active canvas node.
            </p>
          </div>
          {tagName ? <Badge variant="secondary">{tagName}</Badge> : null}
        </div>
      </div>
      <textarea
        className="min-h-32 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        value={draftContent}
        onChange={(event) => {
          const nextValue = event.target.value;
          setDraftContent(nextValue);
          component.set?.("content", nextValue);
          onDirty();
        }}
        placeholder="Edit text or inline HTML for the selected component"
      />
      <AttributeInput
        label="ID"
        value={typeof attributes.id === "string" ? attributes.id : ""}
        onChange={(value) => {
          component.addAttributes?.({ id: value });
          onDirty();
        }}
      />
      {(tagName === "a" || typeof attributes.href === "string") && (
        <AttributeInput
          label="Link URL"
          value={typeof attributes.href === "string" ? attributes.href : ""}
          onChange={(value) => {
            component.addAttributes?.({ href: value });
            onDirty();
          }}
        />
      )}
      {(tagName === "img" || typeof attributes.src === "string") && (
        <>
          <AttributeInput
            label="Image source"
            value={typeof attributes.src === "string" ? attributes.src : ""}
            onChange={(value) => {
              component.addAttributes?.({ src: value });
              onDirty();
            }}
          />
          <AttributeInput
            label="Alt text"
            value={typeof attributes.alt === "string" ? attributes.alt : ""}
            onChange={(value) => {
              component.addAttributes?.({ alt: value });
              onDirty();
            }}
          />
        </>
      )}
    </div>
  );
}

function AttributeInput({
  label,
  onChange,
  value
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

export { LandingContentPanel };

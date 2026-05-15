"use client";

import * as React from "react";
import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@workspace/ui";

type SelectedComponentLike = {
  getStyle?: () => Record<string, string>;
  setStyle?: (style: Record<string, string>) => void;
};

type LandingStylePanelProps = {
  component: SelectedComponentLike | null;
  onDirty: () => void;
};

const styleFields = [
  { key: "color", label: "Text color", type: "color" },
  { key: "background-color", label: "Background", type: "color" },
  { key: "font-size", label: "Font size", type: "text" },
  { key: "font-weight", label: "Weight", type: "select" },
  { key: "padding", label: "Padding", type: "text" },
  { key: "margin", label: "Margin", type: "text" },
  { key: "border-radius", label: "Radius", type: "text" },
  { key: "width", label: "Width", type: "text" },
  { key: "min-height", label: "Min height", type: "text" }
] as const;

function LandingStylePanel({ component, onDirty }: LandingStylePanelProps) {
  const styles = React.useMemo(() => component?.getStyle?.() ?? {}, [component]);

  if (!component) {
    return (
      <div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
        Select a component to edit common visual styles.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-background p-3 text-xs text-muted-foreground">
        Project-owned style controls backed by the selected component style object.
      </div>
      <div className="grid grid-cols-1 gap-3">
        {styleFields.map((field) => (
          <StyleField
            key={field.key}
            field={field}
            value={styles[field.key] ?? ""}
            onChange={(value) => {
              component.setStyle?.({
                ...styles,
                [field.key]: value
              });
              onDirty();
            }}
          />
        ))}
      </div>
    </div>
  );
}

function StyleField({
  field,
  onChange,
  value
}: {
  field: (typeof styleFields)[number];
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">{field.label}</label>
      {field.type === "select" ? (
        <Select
          value={value || "default"}
          onValueChange={(next) => onChange(next === "default" ? "" : next)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Default" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Default</SelectItem>
            <SelectItem value="400">400</SelectItem>
            <SelectItem value="500">500</SelectItem>
            <SelectItem value="600">600</SelectItem>
            <SelectItem value="700">700</SelectItem>
          </SelectContent>
        </Select>
      ) : (
        <Input
          type={field.type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </div>
  );
}

export { LandingStylePanel };

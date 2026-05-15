"use client";

import * as React from "react";
import type {
  LandingEditorLayout,
  PlaceholderField,
  PlaceholderValue
} from "@workspace/types";
import type { WidgetSchemaField } from "@workspace/widgets";
import { Input } from "@workspace/ui";
import { PlaceholderContentPanel } from "./placeholder-content-panel";
import { WidgetConfigPanel } from "./widget-config-panel";

type LandingAdvancedPanelProps = {
  fields: PlaceholderField[];
  layout: LandingEditorLayout;
  onLayoutChange: (layout: LandingEditorLayout) => void;
  onPlaceholderChange: (key: string, value: PlaceholderValue[string]) => void;
  placeholderValues: PlaceholderValue;
  selectedWidget: {
    fields: WidgetSchemaField[];
    props: Record<string, unknown>;
    slug: string;
  } | null;
  onWidgetConfigChange: (key: string, value: unknown) => void;
};

function LandingAdvancedPanel({
  fields,
  layout,
  onLayoutChange,
  onPlaceholderChange,
  placeholderValues,
  selectedWidget,
  onWidgetConfigChange
}: LandingAdvancedPanelProps) {
  return (
    <div className="space-y-4">
      <section className="rounded-lg border bg-background p-3">
        <h3 className="text-sm font-semibold text-foreground">Base Layout</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Persist wrapper, body, and html-level metadata with the landing draft.
        </p>
        <div className="mt-4 space-y-3">
          <LayoutInput
            label="Wrapper class"
            value={layout.wrapperClass ?? ""}
            onChange={(value) => onLayoutChange({ ...layout, wrapperClass: value })}
          />
          <LayoutInput
            label="Body class"
            value={layout.bodyClass ?? ""}
            onChange={(value) => onLayoutChange({ ...layout, bodyClass: value })}
          />
          <LayoutJsonInput
            label="Body attributes (JSON)"
            value={layout.bodyAttributes ?? {}}
            onChange={(value) => onLayoutChange({ ...layout, bodyAttributes: value })}
          />
          <LayoutJsonInput
            label="HTML attributes (JSON)"
            value={layout.htmlAttributes ?? {}}
            onChange={(value) => onLayoutChange({ ...layout, htmlAttributes: value })}
          />
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Template variables</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Placeholder values used by template-driven landing sections.
          </p>
        </div>
        <PlaceholderContentPanel
          fields={fields}
          onChange={onPlaceholderChange}
          values={placeholderValues}
        />
      </section>

      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Widget schema</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Widget-specific advanced settings for the selected component.
          </p>
        </div>
        <WidgetConfigPanel
          fields={selectedWidget?.fields ?? []}
          onChange={onWidgetConfigChange}
          props={selectedWidget?.props ?? {}}
          widgetName={selectedWidget?.slug ?? null}
        />
      </section>
    </div>
  );
}

function LayoutInput({
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

function LayoutJsonInput({
  label,
  onChange,
  value
}: {
  label: string;
  onChange: (value: Record<string, string>) => void;
  value: Record<string, string>;
}) {
  const [draft, setDraft] = React.useState(JSON.stringify(value, null, 2));

  React.useEffect(() => {
    setDraft(JSON.stringify(value, null, 2));
  }, [value]);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <textarea
        className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        value={draft}
        onChange={(event) => {
          const next = event.target.value;
          setDraft(next);
          try {
            const parsed = JSON.parse(next || "{}");
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
              onChange(
                Object.fromEntries(
                  Object.entries(parsed).map(([key, rawValue]) => [key, String(rawValue)])
                )
              );
            }
          } catch {
            // keep local draft until valid JSON
          }
        }}
      />
    </div>
  );
}

export { LandingAdvancedPanel };

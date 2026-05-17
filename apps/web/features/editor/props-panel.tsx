"use client";

import { useMemo } from "react";

import { widgets } from "@workspace/widgets";

import { useLandingEditorStore } from "./store";

function inferInputType(schema: unknown): "checkbox" | "number" | "text" {
  const typeName = (schema as { _def?: { type?: string; typeName?: string } })?._def;
  const normalized = (typeName?.typeName ?? typeName?.type ?? "").toLowerCase();

  if (normalized.includes("boolean")) {
    return "checkbox";
  }
  if (normalized.includes("number")) {
    return "number";
  }
  return "text";
}

export function PropsPanel() {
  const selectedId = useLandingEditorStore((state) => state.selectedId);
  const entries = useLandingEditorStore((state) => state.widgets);
  const updateProps = useLandingEditorStore((state) => state.updateProps);

  const selected = entries.find((entry) => entry.id === selectedId) ?? null;
  const widget = widgets.find((entry) => entry.kind === selected?.kind) ?? null;

  const fields = useMemo(() => {
    const schema = widget?.schema as { shape?: Record<string, unknown> } | undefined;
    return schema?.shape ? Object.entries(schema.shape) : [];
  }, [widget]);

  if (!selected || !widget) {
    return (
      <aside className="rounded-lg border bg-card p-3">
        <h2 className="mb-2 text-sm font-semibold">Props</h2>
        <p className="text-sm text-muted-foreground">Select a widget on the canvas.</p>
      </aside>
    );
  }

  return (
    <aside className="space-y-3 rounded-lg border bg-card p-3">
      <h2 className="text-sm font-semibold">Props: {widget.meta.label}</h2>
      {fields.length === 0 ? (
        <p className="text-sm text-muted-foreground">No editable schema fields.</p>
      ) : (
        fields.map(([key, fieldSchema]) => {
          const inputType = inferInputType(fieldSchema);
          const value = selected.props[key];

          return (
            <label key={key} className="block space-y-1 text-xs">
              <span className="font-medium uppercase tracking-wide text-muted-foreground">
                {key}
              </span>
              {inputType === "checkbox" ? (
                <input
                  type="checkbox"
                  checked={Boolean(value)}
                  onChange={(event) => {
                    const next = { ...selected.props, [key]: event.target.checked };
                    const result = widget.schema.safeParse(next);
                    if (result.success) {
                      updateProps(selected.id, result.data as Record<string, unknown>);
                    }
                  }}
                />
              ) : (
                <input
                  className="w-full rounded border px-2 py-1 text-sm"
                  type={inputType}
                  value={
                    typeof value === "string" || typeof value === "number" ? value : ""
                  }
                  onChange={(event) => {
                    const nextValue =
                      inputType === "number"
                        ? Number(event.target.value || 0)
                        : event.target.value;
                    const next = { ...selected.props, [key]: nextValue };
                    const result = widget.schema.safeParse(next);
                    if (result.success) {
                      updateProps(selected.id, result.data as Record<string, unknown>);
                    }
                  }}
                />
              )}
            </label>
          );
        })
      )}
    </aside>
  );
}

"use client";

import { widgets } from "@workspace/widgets";

import { useLandingEditorStore } from "./store";

export function WidgetPalette() {
  const addWidget = useLandingEditorStore((state) => state.addWidget);

  return (
    <aside className="space-y-3 rounded-lg border bg-card p-3">
      <h2 className="text-sm font-semibold">Widget palette</h2>
      <div className="space-y-2">
        {widgets.map((widget) => (
          <button
            key={widget.kind}
            className="w-full rounded border px-3 py-2 text-left text-sm hover:bg-muted"
            onClick={() => addWidget(widget.kind)}
            type="button"
          >
            <div className="font-medium">{widget.meta.label}</div>
            <div className="text-xs text-muted-foreground">{widget.meta.group}</div>
          </button>
        ))}
      </div>
    </aside>
  );
}

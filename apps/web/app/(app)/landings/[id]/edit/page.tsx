"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { widgets } from "@workspace/widgets";

import {
  fetchLanding,
  fetchLandingRawContext,
  patchLandingEditorContext,
  type LandingEditorContext
} from "../../../../../lib/api";
import { EditorCanvas } from "../../../../../features/editor/canvas";
import { PropsPanel } from "../../../../../features/editor/props-panel";
import {
  useLandingEditorStore,
  type EditorWidgetItem
} from "../../../../../features/editor/store";
import { WidgetPalette } from "../../../../../features/editor/widget-palette";

const SAVE_DELAY_MS = 1000;

function parseInitialWidgets(context: unknown): EditorWidgetItem[] {
  const allowedKinds = new Set(widgets.map((entry) => entry.kind));
  if (!context || typeof context !== "object") {
    return [];
  }

  const items = (context as { widgets?: unknown[] }).widgets;
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .filter((entry): entry is EditorWidgetItem =>
      Boolean(
        entry &&
        typeof entry === "object" &&
        typeof (entry as { id?: unknown }).id === "string" &&
        typeof (entry as { kind?: unknown }).kind === "string" &&
        allowedKinds.has((entry as { kind: string }).kind as never) &&
        typeof (entry as { props?: unknown }).props === "object"
      )
    )
    .map((entry) => ({
      id: entry.id,
      kind: entry.kind as EditorWidgetItem["kind"],
      props: { ...(entry.props as Record<string, unknown>) }
    }));
}

function queueKey(landingId: string) {
  return `landing-editor-queue:${landingId}`;
}

export default function LandingEditPage() {
  const { id } = useParams<{ id: string }>();
  const hydrate = useLandingEditorStore((state) => state.hydrate);
  const widgets = useLandingEditorStore((state) => state.widgets);
  const undo = useLandingEditorStore((state) => state.undo);
  const redo = useLandingEditorStore((state) => state.redo);
  const canUndo = useLandingEditorStore((state) => state.canUndo);
  const canRedo = useLandingEditorStore((state) => state.canRedo);

  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "offline">(
    "idle"
  );
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const landingQuery = useQuery({
    queryKey: ["crm", "landing", id],
    queryFn: () => fetchLanding(id)
  });

  const contextQuery = useQuery({
    queryKey: ["crm", "landing", id, "context"],
    queryFn: () => fetchLandingRawContext(id)
  });

  useEffect(() => {
    if (!contextQuery.data) {
      return;
    }

    hydrate(parseInitialWidgets(contextQuery.data));
  }, [contextQuery.data, hydrate]);

  const payload = useMemo<LandingEditorContext>(() => ({ widgets }), [widgets]);

  useEffect(() => {
    if (!id || contextQuery.isLoading) {
      return;
    }

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(async () => {
      const requestPayload = { widgets: payload.widgets };

      if (!navigator.onLine) {
        const stored = window.localStorage.getItem(queueKey(id));
        const queue = stored ? (JSON.parse(stored) as LandingEditorContext[]) : [];
        queue.push(requestPayload);
        window.localStorage.setItem(queueKey(id), JSON.stringify(queue));
        setSaveState("offline");
        return;
      }

      setSaveState("saving");
      await patchLandingEditorContext(id, requestPayload);
      setSaveState("saved");
    }, SAVE_DELAY_MS);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [contextQuery.isLoading, id, payload]);

  useEffect(() => {
    async function flushQueued() {
      if (!id || !navigator.onLine) {
        return;
      }

      const raw = window.localStorage.getItem(queueKey(id));
      if (!raw) {
        return;
      }

      const queue = JSON.parse(raw) as LandingEditorContext[];
      for (const item of queue) {
        await patchLandingEditorContext(id, item);
      }

      window.localStorage.removeItem(queueKey(id));
      setSaveState("saved");
    }

    const onOnline = () => {
      void flushQueued();
    };

    window.addEventListener("online", onOnline);
    void flushQueued();

    return () => window.removeEventListener("online", onOnline);
  }, [id]);

  if (landingQuery.isLoading || contextQuery.isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading editor...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Link className="text-sm underline-offset-2 hover:underline" href="/landings">
            Back to landings
          </Link>
          <h1 className="text-2xl font-semibold">
            {landingQuery.data?.name ?? "Landing editor"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded border px-2 py-1 text-xs"
            onClick={undo}
            disabled={!canUndo}
          >
            Undo
          </button>
          <button
            type="button"
            className="rounded border px-2 py-1 text-xs"
            onClick={redo}
            disabled={!canRedo}
          >
            Redo
          </button>
          <span className="text-xs text-muted-foreground">{saveState}</span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)_320px]">
        <WidgetPalette />
        <EditorCanvas />
        <PropsPanel />
      </div>
    </div>
  );
}

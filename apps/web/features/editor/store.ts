"use client";

import { create } from "zustand";

import { widgets, type WidgetKind } from "@workspace/widgets";

export type EditorWidgetItem = {
  id: string;
  kind: WidgetKind;
  props: Record<string, unknown>;
};

type Snapshot = {
  selectedId: string | null;
  widgets: EditorWidgetItem[];
};

type EditorStore = {
  canRedo: boolean;
  canUndo: boolean;
  selectedId: string | null;
  widgets: EditorWidgetItem[];
  addWidget: (kind: WidgetKind) => void;
  hydrate: (input: EditorWidgetItem[]) => void;
  removeWidget: (id: string) => void;
  reorderWidgets: (activeId: string, overId: string) => void;
  selectWidget: (id: string | null) => void;
  undo: () => void;
  redo: () => void;
  updateProps: (id: string, next: Record<string, unknown>) => void;
};

const history: Snapshot[] = [];
const future: Snapshot[] = [];
const HISTORY_LIMIT = 50;

function cloneSnapshot(state: Pick<EditorStore, "widgets" | "selectedId">): Snapshot {
  return {
    selectedId: state.selectedId,
    widgets: state.widgets.map((item) => ({ ...item, props: { ...item.props } }))
  };
}

function buildDefaultProps(kind: WidgetKind): Record<string, unknown> {
  const widget = widgets.find((entry) => entry.kind === kind);
  if (!widget) {
    return {};
  }

  const result = widget.schema.safeParse({});
  if (result.success && result.data && typeof result.data === "object") {
    return { ...(result.data as Record<string, unknown>) };
  }

  return {};
}

function makeId(kind: string): string {
  return `${kind}-${Math.random().toString(36).slice(2, 10)}`;
}

function pushHistory(state: EditorStore) {
  history.push(cloneSnapshot(state));
  if (history.length > HISTORY_LIMIT) {
    history.shift();
  }
  future.length = 0;
}

export const useLandingEditorStore = create<EditorStore>((set, get) => ({
  widgets: [],
  selectedId: null,
  canUndo: false,
  canRedo: false,
  hydrate: (input) =>
    set({
      widgets: input,
      selectedId: input[0]?.id ?? null,
      canUndo: false,
      canRedo: false
    }),
  selectWidget: (id) => set({ selectedId: id }),
  addWidget: (kind) => {
    const state = get();
    pushHistory(state);
    const nextItem: EditorWidgetItem = {
      id: makeId(kind),
      kind,
      props: buildDefaultProps(kind)
    };
    set({
      widgets: [...state.widgets, nextItem],
      selectedId: nextItem.id,
      canUndo: history.length > 0,
      canRedo: false
    });
  },
  reorderWidgets: (activeId, overId) => {
    if (activeId === overId) {
      return;
    }

    const state = get();
    const from = state.widgets.findIndex((item) => item.id === activeId);
    const to = state.widgets.findIndex((item) => item.id === overId);

    if (from < 0 || to < 0) {
      return;
    }

    pushHistory(state);
    const next = [...state.widgets];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);

    set({ widgets: next, canUndo: history.length > 0, canRedo: false });
  },
  removeWidget: (id) => {
    const state = get();
    if (!state.widgets.some((item) => item.id === id)) {
      return;
    }

    pushHistory(state);
    const next = state.widgets.filter((item) => item.id !== id);
    set({
      widgets: next,
      selectedId: state.selectedId === id ? (next[0]?.id ?? null) : state.selectedId,
      canUndo: history.length > 0,
      canRedo: false
    });
  },
  updateProps: (id, nextProps) => {
    const state = get();
    const prev = state.widgets.find((item) => item.id === id);

    if (!prev) {
      return;
    }

    pushHistory(state);
    set({
      widgets: state.widgets.map((item) =>
        item.id === id ? { ...item, props: nextProps } : item
      ),
      canUndo: history.length > 0,
      canRedo: false
    });
  },
  undo: () => {
    const state = get();
    const previous = history.pop();

    if (!previous) {
      return;
    }

    future.push(cloneSnapshot(state));
    set({
      widgets: previous.widgets,
      selectedId: previous.selectedId,
      canUndo: history.length > 0,
      canRedo: future.length > 0
    });
  },
  redo: () => {
    const state = get();
    const next = future.pop();

    if (!next) {
      return;
    }

    history.push(cloneSnapshot(state));
    set({
      widgets: next.widgets,
      selectedId: next.selectedId,
      canUndo: history.length > 0,
      canRedo: future.length > 0
    });
  }
}));

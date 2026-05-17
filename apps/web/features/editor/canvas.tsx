"use client";

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { useLandingEditorStore, type EditorWidgetItem } from "./store";

function CanvasCard({ item, selected }: { item: EditorWidgetItem; selected: boolean }) {
  const removeWidget = useLandingEditorStore((state) => state.removeWidget);
  const selectWidget = useLandingEditorStore((state) => state.selectWidget);
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: item.id
  });

  return (
    <article
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`rounded-md border bg-background p-3 ${selected ? "ring-2 ring-primary" : ""}`}
      onClick={() => selectWidget(item.id)}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{item.kind}</p>
          <p className="text-xs text-muted-foreground">#{item.id.slice(-6)}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded border px-2 py-1 text-xs"
            {...attributes}
            {...listeners}
          >
            Move
          </button>
          <button
            type="button"
            className="rounded border px-2 py-1 text-xs hover:bg-muted"
            onClick={(event) => {
              event.stopPropagation();
              removeWidget(item.id);
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </article>
  );
}

export function EditorCanvas() {
  const widgets = useLandingEditorStore((state) => state.widgets);
  const selectedId = useLandingEditorStore((state) => state.selectedId);
  const reorderWidgets = useLandingEditorStore((state) => state.reorderWidgets);
  const sensors = useSensors(useSensor(PointerSensor));

  function onDragEnd(event: DragEndEvent) {
    const activeId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : "";

    if (!activeId || !overId) {
      return;
    }

    reorderWidgets(activeId, overId);
  }

  return (
    <section className="rounded-lg border bg-card p-3">
      <h2 className="mb-3 text-sm font-semibold">Canvas</h2>
      {!widgets.length ? (
        <p className="rounded border border-dashed p-6 text-sm text-muted-foreground">
          Add a widget from the palette to start composing this landing.
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={widgets.map((item) => item.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {widgets.map((item) => (
                <CanvasCard key={item.id} item={item} selected={selectedId === item.id} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </section>
  );
}

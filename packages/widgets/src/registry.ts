import type { RegisteredWidget, WidgetRenderContext } from "./contract";
import { heroWidget } from "./widgets/hero";
import { formWidget } from "./widgets/form";
import { priceBlockWidget } from "./widgets/price-block";
import { testimonialsWidget } from "./widgets/testimonials";
import { wheelWidget } from "./widgets/wheel";

export const widgets = [
  heroWidget,
  formWidget,
  priceBlockWidget,
  wheelWidget,
  testimonialsWidget
] as const;

export type WidgetKind = (typeof widgets)[number]["kind"];

export type WidgetSpec = {
  id: string;
  kind: WidgetKind;
  props: Record<string, unknown>;
};

export type RenderedWidgetNode = {
  id: string;
  kind: WidgetKind;
  html: string;
  meta: (typeof widgets)[number]["meta"];
};

const registry = new Map<WidgetKind, RegisteredWidget>(
  widgets.map((widget) => [widget.kind, widget as RegisteredWidget])
);

const renderCache = new Map<string, readonly RenderedWidgetNode[]>();

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b)
    );
    return `{${entries
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

export function renderTree(
  specs: readonly WidgetSpec[],
  ctx: WidgetRenderContext
): readonly RenderedWidgetNode[] {
  const key = stableStringify({ ctx, specs });
  const cached = renderCache.get(key);

  if (cached) {
    return cached;
  }

  const rendered = specs.map((spec) => {
    const widget = registry.get(spec.kind);

    if (!widget) {
      return {
        id: spec.id,
        kind: spec.kind,
        html:
          ctx.env === "development"
            ? `<section data-widget-error="unknown" data-widget-kind="${spec.kind}">Unknown widget kind: ${spec.kind}</section>`
            : "",
        meta: { group: "Unknown", icon: "alert-triangle", label: "Unknown" }
      } satisfies RenderedWidgetNode;
    }

    const result = widget.schema.safeParse(spec.props);

    if (!result.success) {
      return {
        id: spec.id,
        kind: spec.kind,
        html:
          ctx.env === "development"
            ? `<section data-widget-error="invalid" data-widget-kind="${spec.kind}">Invalid props for ${spec.kind}: ${result.error.issues
                .map((issue) => issue.path.map(String).join(".") || "root")
                .join(", ")}</section>`
            : "",
        meta: widget.meta
      } satisfies RenderedWidgetNode;
    }

    return {
      id: spec.id,
      kind: spec.kind,
      html: widget.render(result.data as never, ctx),
      meta: widget.meta
    } satisfies RenderedWidgetNode;
  });

  renderCache.set(key, rendered);
  return rendered;
}

export function getWidget(kind: WidgetKind): RegisteredWidget | undefined {
  return registry.get(kind);
}

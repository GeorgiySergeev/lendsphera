/** Keep in sync with `WidgetKind` in `packages/widgets/src/registry.ts`. */
export type RegisteredWidgetKind =
  | "hero"
  | "form"
  | "price-block"
  | "wheel"
  | "testimonials";

export type WidgetKind = RegisteredWidgetKind | "article";

export type WidgetSpec = {
  id: string;
  kind: WidgetKind;
  props: Record<string, unknown>;
  widgetId?: string;
  widgetVersionId?: string;
};

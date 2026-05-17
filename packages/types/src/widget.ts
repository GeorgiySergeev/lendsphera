export type WidgetKind =
  | "hero"
  | "form"
  | "price-block"
  | "wheel"
  | "testimonials"
  | "article"
  | string;

export type WidgetSpec = {
  id: string;
  kind: WidgetKind;
  props: Record<string, unknown>;
  widgetId?: string;
  widgetVersionId?: string;
};

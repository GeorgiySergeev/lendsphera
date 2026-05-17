import type { LandingDocument, Widget } from "@workspace/types";

import { CountdownTimer, countdownTimerSchema } from "./countdown-timer";
import { ExitIntentPopup, exitIntentPopupSchema } from "./exit-intent-popup";
import { FortuneWheel, fortuneWheelSchema } from "./fortune-wheel";

export * from "./contract";
export * from "./registry";

export { heroWidget } from "./widgets/hero";
export { formWidget } from "./widgets/form";
export { priceBlockWidget } from "./widgets/price-block";
export { wheelWidget } from "./widgets/wheel";
export { testimonialsWidget } from "./widgets/testimonials";

export {
  buildDefaultProps,
  createWidgetEventEmitter,
  parseWidgetProps,
  serializeWidgetProps,
  type LandingWidget,
  type WidgetManifestItem,
  type WidgetSchema,
  type WidgetSchemaField
} from "./sdk";

export { countdownTimerSchema, exitIntentPopupSchema, fortuneWheelSchema };

export const widgetSchemas = {
  "countdown-timer": countdownTimerSchema,
  "exit-intent-popup": exitIntentPopupSchema,
  "fortune-wheel": fortuneWheelSchema
};

export type WidgetRenderResult = {
  id: string;
  type: Widget["type"];
  html: string;
};

export const widgetRegistry = {
  "countdown-timer": CountdownTimer,
  "exit-intent-popup": ExitIntentPopup,
  "fortune-wheel": FortuneWheel
};

export function createWidgetSdk(document: LandingDocument) {
  return {
    getWidget(id: string) {
      return document.widgets.find((widget) => widget.id === id) ?? null;
    },
    listWidgets() {
      return [...document.widgets].sort((a, b) => a.order - b.order);
    }
  };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function renderWidget(widget: Widget): WidgetRenderResult {
  const heading =
    typeof widget.props.heading === "string" ? widget.props.heading : widget.type;
  const body = typeof widget.props.body === "string" ? widget.props.body : "";

  return {
    id: widget.id,
    type: widget.type,
    html: `<section data-widget-id="${escapeHtml(widget.id)}" data-widget-type="${widget.type}"><h2>${escapeHtml(heading)}</h2><p>${escapeHtml(body)}</p></section>`
  };
}

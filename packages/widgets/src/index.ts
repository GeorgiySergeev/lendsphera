import type { LandingDocument, Widget } from "@workspace/types";

import { CountdownTimer, countdownTimerSchema } from "./countdown-timer";
import { ExitIntentPopup, exitIntentPopupSchema } from "./exit-intent-popup";
import { FortuneWheel, fortuneWheelSchema } from "./fortune-wheel";
import {
  buildDefaultProps,
  createWidgetEventEmitter,
  parseWidgetProps,
  serializeWidgetProps,
  type LandingWidget,
  type WidgetManifestItem,
  type WidgetSchema,
  type WidgetSchemaField
} from "./sdk";

type WidgetRenderResult = {
  id: string;
  type: Widget["type"];
  html: string;
};

const widgetRegistry = {
  "countdown-timer": CountdownTimer,
  "exit-intent-popup": ExitIntentPopup,
  "fortune-wheel": FortuneWheel
} satisfies Record<string, LandingWidget>;

const widgetSchemas = {
  "countdown-timer": countdownTimerSchema,
  "exit-intent-popup": exitIntentPopupSchema,
  "fortune-wheel": fortuneWheelSchema
} satisfies Record<string, WidgetSchema>;

function createWidgetSdk(document: LandingDocument) {
  return {
    getWidget(id: string) {
      return document.widgets.find((widget) => widget.id === id) ?? null;
    },
    listWidgets() {
      return [...document.widgets].sort((a, b) => a.order - b.order);
    }
  };
}

function renderWidget(widget: Widget): WidgetRenderResult {
  const heading =
    typeof widget.props.heading === "string" ? widget.props.heading : widget.type;
  const body = typeof widget.props.body === "string" ? widget.props.body : "";

  return {
    id: widget.id,
    type: widget.type,
    html: `<section data-widget-id="${escapeHtml(widget.id)}" data-widget-type="${widget.type}"><h2>${escapeHtml(heading)}</h2><p>${escapeHtml(body)}</p></section>`
  };
}

function getWidgetSchema(slug: string) {
  return widgetSchemas[slug as keyof typeof widgetSchemas] ?? null;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export {
  CountdownTimer,
  ExitIntentPopup,
  FortuneWheel,
  buildDefaultProps,
  countdownTimerSchema,
  createWidgetEventEmitter,
  createWidgetSdk,
  exitIntentPopupSchema,
  fortuneWheelSchema,
  getWidgetSchema,
  parseWidgetProps,
  renderWidget,
  serializeWidgetProps,
  widgetRegistry,
  widgetSchemas,
  type LandingWidget,
  type WidgetManifestItem,
  type WidgetRenderResult,
  type WidgetSchema,
  type WidgetSchemaField
};

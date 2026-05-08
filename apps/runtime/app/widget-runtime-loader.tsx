"use client";

import * as React from "react";

import {
  createWidgetEventEmitter,
  parseWidgetProps,
  widgetRegistry,
  type LandingWidget
} from "@workspace/widgets";

type LoadedWidget = {
  element: HTMLElement;
  props: Record<string, unknown>;
  widget: LandingWidget;
};

function WidgetRuntimeLoader() {
  React.useEffect(() => {
    const mounted: LoadedWidget[] = [];
    let cancelled = false;

    async function mountWidgets() {
      const elements = Array.from(
        document.querySelectorAll<HTMLElement>("[data-widget]")
      );

      for (const element of elements) {
        const slug = element.dataset.widget;

        if (!slug) {
          continue;
        }

        const widget = await loadWidget(slug, element.dataset.widgetVersion);

        if (cancelled || !widget) {
          continue;
        }

        const props = parseWidgetProps(element.dataset.widgetProps ?? null);
        const context = {
          emit: createWidgetEventEmitter(element),
          props,
          root: element
        };

        await widget.mount(context);
        mounted.push({ element, props, widget });
      }
    }

    void mountWidgets();

    return () => {
      cancelled = true;
      mounted.forEach(({ element, props, widget }) => {
        widget.unmount({
          emit: createWidgetEventEmitter(element),
          props,
          root: element
        });
      });
    };
  }, []);

  return null;
}

async function loadWidget(slug: string, version?: string) {
  const localWidget = widgetRegistry[slug as keyof typeof widgetRegistry];

  if (localWidget) {
    return localWidget;
  }

  const bundleUrl = resolveBundleUrl(slug, version);

  if (!bundleUrl) {
    return null;
  }

  try {
    const widgetModule = await importExternalWidget(bundleUrl);

    return widgetModule.default ?? null;
  } catch {
    return null;
  }
}

function importExternalWidget(bundleUrl: string) {
  const importer = new Function("bundleUrl", "return import(bundleUrl)") as (
    url: string
  ) => Promise<{ default?: LandingWidget }>;

  return importer(bundleUrl);
}

function resolveBundleUrl(slug: string, version?: string) {
  const baseUrl = process.env.NEXT_PUBLIC_WIDGET_BUNDLE_BASE_URL;

  if (!baseUrl) {
    return null;
  }

  const safeVersion = version || "0.1.0";

  return `${baseUrl.replace(/\/$/, "")}/widgets/${encodeURIComponent(safeVersion)}/${encodeURIComponent(slug)}.es.js`;
}

export { WidgetRuntimeLoader };

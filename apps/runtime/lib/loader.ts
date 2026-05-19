import "server-only";

import { cache } from "react";
import { createClient } from "../../../packages/api-client/src/generated/client/client.gen";
import type { LandingContext } from "@workspace/types";
import type { WidgetRenderContext, WidgetSpec } from "@workspace/widgets";

type RuntimeSnapshot = {
  cssText?: string;
  htmlSections: Array<{ id: string; html: string }>;
  specs: WidgetSpec[];
};

type RuntimeLandingPayload = {
  landingId: string;
  slug: string;
  geo: string;
  title: string;
  description?: string;
  context: LandingContext;
  snapshot: RuntimeSnapshot;
  versionId: string;
  isDraft: boolean;
};

type RuntimeLoadResult = RuntimeLandingPayload & {
  renderContext: WidgetRenderContext;
  needsWidgetRuntimeLoader: boolean;
};

const runtimeClient = createClient({
  baseUrl: process.env.RUNTIME_API_URL ?? "http://127.0.0.1:4000/api"
});

const loadLandingRuntimeData = cache(
  async (
    geo: string,
    slug: string,
    previewToken: string | null
  ): Promise<RuntimeLoadResult | null> => {
    const response = await runtimeClient.get({
      url: `/v1/runtime/landings/${encodeURIComponent(geo)}/${encodeURIComponent(slug)}`,
      query: previewToken ? { preview: previewToken } : undefined,
      headers: process.env.RUNTIME_API_BRIDGE_KEY
        ? { "X-LS-Bridge-Key": process.env.RUNTIME_API_BRIDGE_KEY }
        : undefined,
      responseStyle: "fields",
      parseAs: "json"
    });

    if (response.response.status === 404) {
      return null;
    }

    if (!response.response.ok) {
      throw new Error(
        `Failed to load runtime landing (${response.response.status} ${response.response.statusText})`
      );
    }

    const payload = normalizePayload(response.data);

    if (!payload) {
      return null;
    }

    return {
      ...payload,
      renderContext: {
        env: process.env.NODE_ENV === "production" ? "production" : "development",
        locale: payload.context.lang
      },
      needsWidgetRuntimeLoader:
        payload.snapshot.specs.some(
          (spec) =>
            typeof spec.props.widgetBundleUrl === "string" ||
            typeof spec.props.widgetVersion === "string"
        ) ||
        payload.snapshot.htmlSections.some((section) =>
          /data-widget(?:=|-)["']?/i.test(section.html)
        )
    };
  }
);

function normalizePayload(input: unknown): RuntimeLandingPayload | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const data = input as Record<string, unknown>;
  const landingId = asString(data.landingId);
  const slug = asString(data.slug);
  const geo = asString(data.geo);
  const title = asString(data.title);
  const versionId = asString(data.versionId);
  const context = data.context as LandingContext | undefined;
  const snapshot = data.snapshot as { specs?: unknown } | undefined;

  if (!landingId || !slug || !geo || !title || !versionId || !context || !snapshot) {
    return null;
  }

  const specs = normalizeSpecs(snapshot.specs);
  const htmlSections = normalizeHtmlSections(
    (snapshot as { htmlSections?: unknown }).htmlSections
  );

  return {
    landingId,
    slug,
    geo,
    title,
    description: asOptionalString(data.description),
    context,
    snapshot: {
      specs,
      htmlSections,
      cssText: asOptionalString((snapshot as { cssText?: unknown }).cssText)
    },
    versionId,
    isDraft: Boolean(data.isDraft)
  };
}

function normalizeSpecs(input: unknown): WidgetSpec[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((entry, index) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const row = entry as Record<string, unknown>;
      const id = asString(row.id) ?? `widget-${index + 1}`;
      const kind = asString(row.kind) ?? asString(row.type);
      const props = row.props;

      if (!kind || !props || typeof props !== "object") {
        return null;
      }

      return {
        id,
        kind: kind as WidgetSpec["kind"],
        props: props as Record<string, unknown>
      } satisfies WidgetSpec;
    })
    .filter((item): item is WidgetSpec => item !== null);
}

function normalizeHtmlSections(input: unknown) {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((entry, index) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const row = entry as Record<string, unknown>;
      const id = asString(row.id) ?? `section-${index + 1}`;
      const html = asString(row.html);

      if (!html) {
        return null;
      }

      return { id, html };
    })
    .filter((item): item is { id: string; html: string } => item !== null);
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

export { loadLandingRuntimeData };

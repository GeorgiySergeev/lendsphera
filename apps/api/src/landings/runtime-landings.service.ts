import { Injectable } from "@nestjs/common";
import { LandingStatus, VersionStatus } from "@prisma/client";
import type { LandingContext } from "@workspace/types";

import { PrismaService } from "../prisma/prisma.service";
import { LandingContextResolver } from "./landing-context.resolver";
import { verifyPreviewToken } from "./preview-token";

type RuntimeWidgetSpec = {
  id: string;
  kind: string;
  props: Record<string, unknown>;
};

type RuntimeLandingResult = {
  context: LandingContext;
  description?: string;
  geo: string;
  isDraft: boolean;
  landingId: string;
  slug: string;
  snapshot: {
    specs: RuntimeWidgetSpec[];
  };
  title: string;
  versionId: string;
} | null;

@Injectable()
export class RuntimeLandingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly landingContext: LandingContextResolver
  ) {}

  async getByGeoAndSlug(
    geoCode: string,
    slug: string,
    previewToken: string | null
  ): Promise<RuntimeLandingResult> {
    const landing = await this.prisma.landing.findFirst({
      where: {
        deletedAt: null,
        slug,
        status: LandingStatus.PUBLISHED,
        geo: { code: { equals: geoCode, mode: "insensitive" } }
      },
      include: {
        geo: true,
        versions: {
          orderBy: [{ versionNum: "desc" }]
        },
        currentVersion: true
      }
    });

    if (!landing) {
      return null;
    }

    const previewPayload = verifyPreviewToken(previewToken);
    const canUseDraft =
      previewPayload?.landingId === landing.id &&
      previewPayload.geo.toLowerCase() === landing.geo.code.toLowerCase() &&
      previewPayload.slug === landing.slug;
    const published =
      landing.versions.find((item) => item.status === VersionStatus.PUBLISHED) ?? null;
    const draftCandidate = landing.currentVersion ?? landing.versions[0] ?? null;
    const selected = canUseDraft && draftCandidate ? draftCandidate : published;

    if (!selected) {
      return null;
    }

    const context = await this.landingContext.resolve(landing.id);
    const specs = this.resolveSnapshotSpecs(selected.grapesJson, selected.html ?? "");

    return {
      landingId: landing.id,
      slug: landing.slug,
      geo: landing.geo.code.toLowerCase(),
      title: landing.name,
      description: landing.notes ?? undefined,
      context,
      snapshot: { specs },
      versionId: selected.id,
      isDraft: canUseDraft && selected.id === draftCandidate?.id
    };
  }

  private resolveSnapshotSpecs(grapesJson: unknown, html: string): RuntimeWidgetSpec[] {
    const fromGrapes = this.extractFromGrapes(grapesJson);
    if (fromGrapes.length > 0) {
      return fromGrapes;
    }
    return this.extractFromHtml(html);
  }

  private extractFromGrapes(input: unknown): RuntimeWidgetSpec[] {
    if (!input || typeof input !== "object") {
      return [];
    }

    const grapes = input as Record<string, unknown>;
    const snapshot = grapes.snapshot;
    if (!snapshot || typeof snapshot !== "object") {
      return [];
    }

    const specs = (snapshot as { specs?: unknown }).specs;
    if (!Array.isArray(specs)) {
      return [];
    }

    return specs
      .map((item, index) => {
        if (!item || typeof item !== "object") {
          return null;
        }

        const row = item as Record<string, unknown>;
        const kind =
          typeof row.kind === "string"
            ? row.kind
            : typeof row.type === "string"
              ? row.type
              : null;
        if (!kind) {
          return null;
        }
        const props =
          row.props && typeof row.props === "object"
            ? (row.props as Record<string, unknown>)
            : {};

        return {
          id: typeof row.id === "string" ? row.id : `widget-${index + 1}`,
          kind,
          props
        } satisfies RuntimeWidgetSpec;
      })
      .filter((item): item is RuntimeWidgetSpec => item !== null);
  }

  private extractFromHtml(html: string): RuntimeWidgetSpec[] {
    if (!html.trim()) {
      return [];
    }

    const specs: RuntimeWidgetSpec[] = [];
    const regex = /<div[^>]*data-widget="([^"]+)"[^>]*>/gim;
    let match: RegExpExecArray | null;
    let index = 0;

    while ((match = regex.exec(html)) !== null) {
      index += 1;
      const tag = match[0];
      const slug = match[1];
      const props = parseHtmlWidgetProps(tag);
      const widgetVersion = getTagAttr(tag, "data-widget-version");
      const widgetBundleUrl = getTagAttr(tag, "data-widget-bundle-url");

      if (widgetVersion) {
        props.widgetVersion = widgetVersion;
      }
      if (widgetBundleUrl) {
        props.widgetBundleUrl = decodeURIComponentSafe(widgetBundleUrl);
      }

      specs.push({
        id: getTagAttr(tag, "id") ?? `widget-${index}`,
        kind: slug,
        props
      });
    }

    return specs;
  }
}

function parseHtmlWidgetProps(tag: string): Record<string, unknown> {
  const raw = getTagAttr(tag, "data-widget-props");
  if (!raw) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function getTagAttr(tag: string, name: string): string | null {
  const attrRegex = new RegExp(`${name}="([^"]*)"`, "i");
  const match = tag.match(attrRegex);
  return match?.[1] ?? null;
}

function decodeURIComponentSafe(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

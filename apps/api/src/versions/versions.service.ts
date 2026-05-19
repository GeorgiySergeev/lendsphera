import { Injectable } from "@nestjs/common";
import { Prisma, VersionStatus } from "@prisma/client";

import type { AuthUser } from "../common/current-user.decorator";
import { toInputJson } from "../common/prisma-json";
import { mapPrismaError } from "../common/prisma-errors";
import { PrismaService } from "../prisma/prisma.service";
import { createEditorAssetToken } from "../landings/editor-asset-token";
import {
  extractImportedLanding,
  resolveImportedAssetUrl,
  rewriteImportedAssetUrls,
  rewriteImportedCssUrls
} from "../zip-import/imported-landing.utils";
import type { CreateVersionDto, ListVersionsQueryDto } from "./versions.dto";

const DIFF_FIELDS = [
  "grapesJson",
  "placeholders",
  "html",
  "css",
  "customCss",
  "customJs"
] as const;
const PRICE_KEYS = ["price", "oldPrice", "discount", "currency"] as const;

@Injectable()
export class VersionsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForLanding(landingId: string, query: ListVersionsQueryDto) {
    const where: Prisma.VersionWhereInput = {
      landingId,
      status: query.includeAutosave ? undefined : { not: VersionStatus.AUTOSAVE }
    };

    const items = await this.prisma.version.findMany({
      where,
      include: {
        author: { select: { id: true, email: true, name: true, role: true } }
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      cursor: query.cursor ? { id: query.cursor } : undefined,
      skip: query.cursor ? 1 : 0,
      take: query.take
    });

    return {
      items,
      nextCursor: items.length === query.take ? (items.at(-1)?.id ?? null) : null
    };
  }

  get(id: string) {
    return this.prisma.version.findUniqueOrThrow({
      where: { id },
      include: {
        landing: true,
        author: { select: { id: true, email: true, name: true, role: true } }
      }
    });
  }

  async create(landingId: string, dto: CreateVersionDto, user: AuthUser) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.landing.findUniqueOrThrow({ where: { id: landingId } });
        const latest = await tx.version.findFirst({
          where: { landingId },
          orderBy: { versionNum: "desc" },
          select: { versionNum: true }
        });
        const version = await tx.version.create({
          data: {
            landingId,
            versionNum: (latest?.versionNum ?? 0) + 1,
            status: dto.status ?? VersionStatus.MANUAL,
            grapesJson: toInputJson(dto.grapesJson) ?? Prisma.JsonNull,
            placeholders: toInputJson(dto.placeholders) ?? Prisma.JsonNull,
            html: dto.html,
            css: dto.css,
            customCss: dto.customCss,
            customJs: dto.customJs,
            snapshotS3Key: dto.snapshotS3Key,
            snapshotSize: dto.snapshotSize,
            authorId: user.id,
            message: dto.message
          }
        });

        if (dto.setCurrent) {
          await tx.landing.update({
            where: { id: landingId },
            data: { currentVersionId: version.id }
          });
        }

        return version;
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async saveDraft(landingId: string, dto: any, user: AuthUser) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const landing = await tx.landing.findUniqueOrThrow({
          where: { id: landingId },
          select: {
            currentVersion: {
              select: {
                grapesJson: true
              }
            }
          }
        });
        const latest = await tx.version.findFirst({
          where: { landingId },
          orderBy: { versionNum: "desc" },
          select: { versionNum: true }
        });
        const recentVersions = await tx.version.findMany({
          where: { landingId },
          orderBy: { versionNum: "desc" },
          select: { grapesJson: true },
          take: 20
        });

        const importedLanding =
          extractImportedLanding(landing.currentVersion?.grapesJson) ??
          recentVersions
            .map((version) => extractImportedLanding(version.grapesJson))
            .find((candidate): candidate is NonNullable<typeof candidate> =>
              Boolean(candidate)
            );

        const assetRewriteOptions = importedLanding
          ? {
              assetToken: createEditorAssetToken({
                landingId,
                userId: user.id
              }),
              landingId
            }
          : undefined;

        const normalizedComponents = importedLanding
          ? normalizeProjectAssetUrls(
              dto.components,
              importedLanding,
              assetRewriteOptions
            )
          : dto.components;

        // #region agent log
        const normalizedText = JSON.stringify(normalizedComponents ?? {});
        fetch("http://127.0.0.1:7285/ingest/96a37387-d690-48d0-ba19-eb148c34d87e", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Debug-Session-Id": "3eb14a"
          },
          body: JSON.stringify({
            sessionId: "3eb14a",
            runId: "pre-fix",
            hypothesisId: "H5",
            location: "versions.service.ts:saveDraft",
            message: "draft save normalized components",
            data: {
              landingId,
              hasImportedLanding: Boolean(importedLanding),
              relativeJsSrcCount: (normalizedText.match(/src=["']js\//g) ?? []).length,
              relativeImgSrcCount: (normalizedText.match(/src=["']images\//g) ?? [])
                .length,
              s3UrlCount: (normalizedText.match(/localhost:9000/g) ?? []).length
            },
            timestamp: Date.now()
          })
        }).catch(() => {});
        // #endregion

        const grapesJson = {
          assets: dto.assets,
          components: normalizedComponents,
          layout: dto.layout,
          styles: dto.styles,
          ...(importedLanding ? { importedLanding } : {})
        };

        const normalizedHtml = importedLanding
          ? rewriteImportedAssetUrls(
              importedLanding,
              dto.html ?? "",
              importedLanding.entrypoint,
              assetRewriteOptions
            )
          : dto.html;
        const normalizedCss = importedLanding
          ? rewriteImportedCssUrls(
              importedLanding,
              dto.css ?? "",
              importedLanding.entrypoint,
              assetRewriteOptions
            )
          : dto.css;
        const normalizedCustomCss = importedLanding
          ? rewriteImportedCssUrls(
              importedLanding,
              dto.customCss ?? "",
              importedLanding.entrypoint,
              assetRewriteOptions
            )
          : dto.customCss;

        const version = await tx.version.create({
          data: {
            landingId,
            versionNum: (latest?.versionNum ?? 0) + 1,
            status: VersionStatus.AUTOSAVE,
            grapesJson: toInputJson(grapesJson) ?? Prisma.JsonNull,
            placeholders: toInputJson(dto.placeholderValues) ?? Prisma.JsonNull,
            html: normalizedHtml,
            css: normalizedCss,
            customCss: normalizedCustomCss,
            authorId: user.id,
            message: dto.message || "Autosaved draft"
          }
        });

        await tx.landing.update({
          where: { id: landingId },
          data: { currentVersionId: version.id }
        });

        return version;
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async restore(id: string, user: AuthUser) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const source = await tx.version.findUniqueOrThrow({ where: { id } });
        const latest = await tx.version.findFirst({
          where: { landingId: source.landingId },
          orderBy: { versionNum: "desc" },
          select: { versionNum: true }
        });
        const restored = await tx.version.create({
          data: {
            landingId: source.landingId,
            versionNum: (latest?.versionNum ?? 0) + 1,
            status: VersionStatus.ROLLBACK,
            grapesJson: toInputJson(source.grapesJson) ?? Prisma.JsonNull,
            placeholders: toInputJson(source.placeholders) ?? Prisma.JsonNull,
            html: source.html,
            css: source.css,
            customCss: source.customCss,
            customJs: source.customJs,
            snapshotS3Key: source.snapshotS3Key,
            snapshotSize: source.snapshotSize,
            authorId: user.id,
            parentVersionId: source.id,
            message: `Restored from version ${source.versionNum}`
          }
        });

        await tx.landing.update({
          where: { id: source.landingId },
          data: { currentVersionId: restored.id }
        });

        return restored;
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async diff(fromId: string, toId: string) {
    const [from, to] = await this.prisma.$transaction([
      this.prisma.version.findUniqueOrThrow({ where: { id: fromId } }),
      this.prisma.version.findUniqueOrThrow({ where: { id: toId } })
    ]);

    const fromPlaceholders = this.toRecord(from.placeholders);
    const toPlaceholders = this.toRecord(to.placeholders);

    return {
      fromId,
      toId,
      fields: DIFF_FIELDS.map((field) => ({
        field,
        changed: JSON.stringify(from[field]) !== JSON.stringify(to[field]),
        from: from[field],
        to: to[field]
      })),
      priceHighlights: PRICE_KEYS.map((key) => ({
        key,
        from: fromPlaceholders[key] ?? null,
        to: toPlaceholders[key] ?? null,
        changed: (fromPlaceholders[key] ?? null) !== (toPlaceholders[key] ?? null)
      })).filter((item) => item.changed)
    };
  }

  private toRecord(input: unknown): Record<string, string> {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      return {};
    }

    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(input)) {
      if (typeof value === "string") {
        result[key] = value;
      }
    }

    return result;
  }
}

function normalizeProjectAssetUrls(
  input: unknown,
  importedLanding: any,
  options?: { assetToken: string; landingId: string }
): unknown {
  if (typeof input === "string") {
    return rewriteImportedAssetUrls(
      importedLanding,
      input,
      importedLanding.entrypoint,
      options
    );
  }

  if (Array.isArray(input)) {
    return input.map((item) => normalizeProjectAssetUrls(item, importedLanding, options));
  }

  if (!input || typeof input !== "object") {
    return input;
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (
      typeof value === "string" &&
      (key.toLowerCase() === "src" ||
        key.toLowerCase() === "href" ||
        key.toLowerCase() === "poster")
    ) {
      result[key] =
        resolveImportedAssetUrl(
          importedLanding,
          importedLanding.entrypoint,
          value,
          options
        ) ?? value;
      continue;
    }

    if (typeof value === "string" && /(css|style)$/i.test(key)) {
      result[key] = rewriteImportedCssUrls(
        importedLanding,
        value,
        importedLanding.entrypoint,
        options
      );
      continue;
    }

    result[key] = normalizeProjectAssetUrls(value, importedLanding, options);
  }

  return result;
}

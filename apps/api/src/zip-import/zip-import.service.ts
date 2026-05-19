import { Injectable, Logger } from "@nestjs/common";
import { LandingStatus, LandingOrigin, Prisma, VersionStatus } from "@prisma/client";
import { createHash } from "node:crypto";

import type { AuthUser } from "../common/current-user.decorator";
import { mapPrismaError } from "../common/prisma-errors";
import { toInputJson } from "../common/prisma-json";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import {
  extractDocument,
  extractImportedCodeVariables,
  extractSections,
  parseZipLanding,
  rewriteAssetUrls
} from "./zip-import.parser";
import { assertValidZip } from "./zip-import.validator";
import type { ImportedLanding } from "./zip-import.types";

interface CreateFromZipInput {
  name: string;
  slug: string;
  geoId: string;
  categoryId: string;
  variantId: string;
  templateId?: string;
  publicId?: string;
  file: Express.Multer.File;
}

interface ReplaceDraftInput {
  landingId: string;
  file: Express.Multer.File;
}

@Injectable()
export class ZipImportService {
  private readonly logger = new Logger(ZipImportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService
  ) {}

  async createFromZip(input: CreateFromZipInput, user: AuthUser) {
    assertValidZip(input.file);
    const parsed = parseZipLanding(input.file);

    const contentHash = createHash("sha256").update(input.file.buffer).digest("hex");

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const identifiers = await this.reserveUniqueIdentifiers(
          tx,
          input.geoId,
          input.slug,
          input.publicId ?? input.slug
        );

        const landing = await tx.landing.create({
          data: {
            name: input.name.trim(),
            slug: identifiers.slug,
            publicId: identifiers.publicId,
            geoId: input.geoId,
            categoryId: input.categoryId,
            variantId: input.variantId,
            templateId: input.templateId ?? null,
            ownerId: user.id,
            status: LandingStatus.DRAFT,
            origin: LandingOrigin.NATIVE
          }
        });

        const latest = await tx.version.findFirst({
          where: { landingId: landing.id },
          orderBy: { versionNum: "desc" },
          select: { versionNum: true }
        });
        const nextVersionNum = (latest?.versionNum ?? 0) + 1;

        const importedLanding = await this.buildImportedLanding(
          input.file,
          parsed,
          contentHash,
          user.id,
          landing.id,
          nextVersionNum
        );

        const renderableHtml = this.buildRenderableHtml(importedLanding);
        const mergedCss = this.buildMergedCss(importedLanding);

        const version = await tx.version.create({
          data: {
            landingId: landing.id,
            versionNum: nextVersionNum,
            status: VersionStatus.MANUAL,
            grapesJson: toInputJson({ importedLanding }) ?? Prisma.JsonNull,
            placeholders: Prisma.JsonNull,
            html: renderableHtml,
            css: mergedCss,
            customCss: mergedCss,
            authorId: user.id,
            message: `Imported from ZIP: ${input.file.originalname}`
          }
        });

        await tx.landing.update({
          where: { id: landing.id },
          data: { currentVersionId: version.id }
        });

        return { landing, version, importedLanding };
      });

      return result;
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async replaceDraft(input: ReplaceDraftInput, user: AuthUser) {
    assertValidZip(input.file);
    const parsed = parseZipLanding(input.file);

    const contentHash = createHash("sha256").update(input.file.buffer).digest("hex");

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const landing = await tx.landing.findUniqueOrThrow({
          where: { id: input.landingId }
        });

        const latest = await tx.version.findFirst({
          where: { landingId: landing.id },
          orderBy: { versionNum: "desc" },
          select: { versionNum: true }
        });
        const nextVersionNum = (latest?.versionNum ?? 0) + 1;

        const importedLanding = await this.buildImportedLanding(
          input.file,
          parsed,
          contentHash,
          user.id,
          landing.id,
          nextVersionNum
        );

        const renderableHtml = this.buildRenderableHtml(importedLanding);
        const mergedCss = this.buildMergedCss(importedLanding);

        const version = await tx.version.create({
          data: {
            landingId: landing.id,
            versionNum: nextVersionNum,
            status: VersionStatus.AUTOSAVE,
            grapesJson: toInputJson({ importedLanding }) ?? Prisma.JsonNull,
            placeholders: Prisma.JsonNull,
            html: renderableHtml,
            css: mergedCss,
            customCss: mergedCss,
            authorId: user.id,
            message: `Replaced draft from ZIP: ${input.file.originalname}`
          }
        });

        await tx.landing.update({
          where: { id: landing.id },
          data: { currentVersionId: version.id }
        });

        return { landing, version, importedLanding };
      });

      return result;
    } catch (error) {
      mapPrismaError(error);
    }
  }

  private async buildImportedLanding(
    file: Express.Multer.File,
    parsed: ReturnType<typeof parseZipLanding>,
    contentHash: string,
    importerId: string,
    landingId: string,
    versionNum: number
  ): Promise<ImportedLanding> {
    const basePath = `landings/${landingId}/versions/${versionNum}`;
    const zipS3Key = `${basePath}/source.zip`;
    await this.storage.putObject({
      key: zipS3Key,
      body: file.buffer,
      contentType: "application/zip"
    });

    const assetMeta = parsed.assets.map((asset) => {
      const s3Key = `${basePath}/assets/${asset.path}`;
      return {
        path: asset.path,
        mimeType: asset.mimeType,
        original: asset.content,
        s3Key,
        url: this.storage.getObjectUrl(s3Key)
      };
    });

    const assetUrlMap = new Map(assetMeta.map((asset) => [asset.path, asset.url]));
    const { html: rewrittenHtml, css: rewrittenCss } = rewriteAssetUrls(
      parsed.indexHtml.path,
      parsed.indexHtml.content,
      parsed.cssFiles,
      assetUrlMap
    );

    const document = extractDocument(rewrittenHtml);
    const sections = extractSections(rewrittenHtml, rewrittenCss);
    const variables = extractImportedCodeVariables(rewrittenHtml);

    const assets = await Promise.all(
      assetMeta.map(async (asset) => {
        const cssOverride = rewrittenCss.find((css) => css.path === asset.path);
        const body = cssOverride
          ? Buffer.from(cssOverride.content, "utf-8")
          : asset.original;
        await this.storage.putObject({
          key: asset.s3Key,
          body,
          contentType: asset.mimeType
        });

        return {
          path: asset.path,
          mimeType: asset.mimeType,
          size: body.length,
          s3Key: asset.s3Key,
          url: asset.url
        };
      })
    );

    const importedLanding: ImportedLanding = {
      source: {
        filename: file.originalname,
        size: file.size,
        contentHash,
        importedAt: new Date().toISOString(),
        importerId,
        s3Key: zipS3Key
      },
      entrypoint: parsed.indexHtml.path,
      assets,
      document,
      sections,
      variables,
      renderMode: "universal-sections"
    };

    return importedLanding;
  }

  private buildRenderableHtml(importedLanding: ImportedLanding): string {
    return importedLanding.document.rawHtml;
  }

  private buildMergedCss(importedLanding: ImportedLanding): string {
    const parts: string[] = [];

    // Inline styles from head
    for (const css of importedLanding.document.inlineCss) {
      parts.push(css);
    }

    // Style sections
    const styleSections = importedLanding.sections.filter(
      (s) => s.type === "style-section"
    );
    for (const section of styleSections) {
      if (section.css) parts.push(section.css);
    }

    return parts.join("\n\n");
  }

  private async reserveUniqueIdentifiers(
    tx: Pick<PrismaService, "landing">,
    geoId: string,
    slug: string,
    publicId: string
  ) {
    const baseSlug = slug.trim();
    const basePublicId = publicId.trim() || baseSlug;

    let candidateSlug = baseSlug;
    let candidatePublicId = basePublicId;
    let suffix = 1;

    while (
      await tx.landing.findFirst({
        where: {
          OR: [
            { publicId: { equals: candidatePublicId, mode: "insensitive" } },
            {
              geoId,
              slug: { equals: candidateSlug, mode: "insensitive" }
            }
          ]
        },
        select: { id: true }
      })
    ) {
      suffix += 1;
      candidateSlug = `${baseSlug}-${suffix}`;
      candidatePublicId = `${basePublicId}-${suffix}`;
    }

    return {
      slug: candidateSlug,
      publicId: candidatePublicId
    };
  }
}

import path from "node:path";
import { BadRequestException, Injectable } from "@nestjs/common";
import {
  AssetType,
  LandingOrigin,
  LandingStatus,
  Prisma,
  VersionStatus
} from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import { type AuthUser } from "../common/current-user.decorator";
import { classifyBlocks } from "./detect/classify";
import { parseLegacyHtml } from "./parser/dom";
import { env } from "../config/env";

@Injectable()
export class LegacyImporterOrchestratorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService
  ) {}

  async promoteWrappedLanding(landingId: string, user: AuthUser) {
    const wrapped = await this.prisma.landing.findUniqueOrThrow({
      where: { id: landingId },
      include: { geo: true, category: true, variant: true }
    });

    if (wrapped.origin !== LandingOrigin.WRAPPED_LEGACY || !wrapped.legacyRef) {
      throw new BadRequestException(
        "Promotion is available only for WRAPPED_LEGACY landings with legacyRef."
      );
    }
    const existingCandidate = await this.prisma.landing.findFirst({
      where: {
        settings: {
          path: ["legacyPromotion", "wrappedLandingId"],
          equals: wrapped.id
        },
        deletedAt: null
      }
    });
    if (existingCandidate) {
      return {
        idempotent: true,
        wrappedLandingId: wrapped.id,
        nativeDraftLandingId: existingCandidate.id,
        detectedBlocks: 0,
        uploadedAssets: 0
      };
    }

    const legacy = await this.prisma.legacyLanding.findUnique({
      where: { path: wrapped.legacyRef }
    });
    if (!legacy) {
      throw new BadRequestException(
        `No LegacyLanding found for legacyRef "${wrapped.legacyRef}".`
      );
    }

    const htmlFile = await this.pickMainHtmlFile(legacy.id);
    const html =
      htmlFile.textContent ??
      (await this.storage.getObjectBuffer(htmlFile.s3Key)).toString("utf8");
    const parsed = parseLegacyHtml(html);
    const blocks = classifyBlocks(parsed.root);
    const mappedWidgets = blocks.map((block, index) => ({
      id: `legacy-${index + 1}`,
      kind: this.mapKindToWidget(block.kind),
      props: {
        sourceNodeRef: block.nodeRef,
        confidence: block.confidence
      }
    }));
    const uploadedAssets = await this.uploadLinkedImageAssets(
      legacy.id,
      htmlFile.path,
      html,
      user.id
    );
    const templateId = await this.ensureTemplate(user.id, wrapped.categoryId);

    return this.prisma.$transaction(async (tx) => {
      const promotionSettings = {
        legacyPromotion: {
          wrappedLandingId: wrapped.id,
          legacyLandingId: legacy.id,
          legacyRef: wrapped.legacyRef,
          sourceHtmlPath: htmlFile.path,
          uploadedAssetIds: uploadedAssets.map((asset) => asset.id)
        }
      } satisfies Prisma.JsonObject;

      const candidate = await tx.landing.create({
        data: {
          publicId: `${wrapped.publicId}-native`,
          name: `${wrapped.name} (Native Draft)`,
          slug: `${wrapped.slug}-native`,
          geoId: wrapped.geoId,
          categoryId: wrapped.categoryId,
          variantId: wrapped.variantId,
          ownerId: user.id,
          templateId,
          status: LandingStatus.DRAFT,
          origin: LandingOrigin.NATIVE,
          tags: Array.from(new Set([...(wrapped.tags ?? []), "imported-legacy"])),
          settings: promotionSettings
        }
      });

      const currentVersion = await tx.version.create({
        data: {
          landingId: candidate.id,
          versionNum: 1,
          status: VersionStatus.MANUAL,
          grapesJson: {
            snapshot: { specs: mappedWidgets }
          } as Prisma.InputJsonValue,
          placeholders: Prisma.JsonNull,
          html,
          css: "",
          customCss: "",
          customJs: "",
          authorId: user.id,
          message: `Promoted from ${wrapped.legacyRef}`
        }
      });

      await tx.landing.update({
        where: { id: candidate.id },
        data: {
          currentVersionId: currentVersion.id,
          settings: promotionSettings
        }
      });
      await tx.legacyLanding.update({
        where: { id: legacy.id },
        data: {
          importedAsId: candidate.id,
          importedAt: new Date()
        }
      });

      return {
        idempotent: false,
        wrappedLandingId: wrapped.id,
        nativeDraftLandingId: candidate.id,
        detectedBlocks: blocks.length,
        uploadedAssets: uploadedAssets.length
      };
    });
  }

  private async ensureTemplate(authorId: string, categoryId: string) {
    const template = await this.prisma.template.upsert({
      where: { slug: "legacy-promoted-native" },
      update: { isActive: true },
      create: {
        slug: "legacy-promoted-native",
        name: "Legacy Promoted Native",
        description: "Template used for WRAPPED->NATIVE promotion drafts.",
        baseHtml: "{{legacyHtml}}",
        placeholders: [{ key: "legacyHtml", type: "richtext", label: "Legacy HTML" }],
        isActive: true,
        isPublic: false,
        authorId,
        categoryId
      }
    });
    return template.id;
  }

  private async pickMainHtmlFile(legacyLandingId: string) {
    const files = await this.prisma.legacyFile.findMany({
      where: { legacyLandingId, extension: { in: ["html", "htm"] } },
      orderBy: [{ path: "asc" }]
    });

    const preferred =
      files.find((file) => /(^|\/)index\.html?$/i.test(file.path)) ?? files[0];
    if (!preferred) {
      throw new BadRequestException("Legacy landing does not contain HTML files.");
    }
    return preferred;
  }

  private mapKindToWidget(kind: string) {
    const map: Record<string, string> = {
      hero: "hero",
      form: "order-form",
      price: "price",
      testimonials: "testimonials",
      wheel: "wheel"
    };
    return map[kind] ?? "html-block";
  }

  private async uploadLinkedImageAssets(
    legacyLandingId: string,
    htmlPath: string,
    html: string,
    uploaderId: string
  ) {
    const refs = [...html.matchAll(/\b(?:src|href)=["']([^"']+)["']/gi)]
      .map((match) => match[1] ?? "")
      .filter((value) => value && !/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(value));
    const imageRefs = refs.filter((ref) =>
      /\.(png|jpe?g|gif|webp|svg)(?:\?|#|$)/i.test(ref)
    );
    const unique = Array.from(new Set(imageRefs)).slice(0, 12);
    const uploaded: Array<{ id: string }> = [];
    for (const ref of unique) {
      const cleanRef = ref.split("#")[0]?.split("?")[0] ?? ref;
      const assetPath = normalizeLegacyPath(
        path.posix.normalize(path.posix.join(path.posix.dirname(htmlPath), cleanRef))
      );
      const asset = await this.prisma.legacyFile.findUnique({
        where: {
          legacyLandingId_path: { legacyLandingId, path: assetPath }
        }
      });
      if (!asset) continue;
      const buffer = await this.storage.getObjectBuffer(asset.s3Key);
      const s3Key = `legacy-assets/${legacyLandingId}/${Date.now().toString(36)}-${path.basename(asset.path)}`;
      await this.storage.putObject({
        key: s3Key,
        contentType: asset.mimeType ?? "application/octet-stream",
        body: buffer
      });
      const created = await this.prisma.asset.create({
        data: {
          uploaderId,
          type: AssetType.IMAGE,
          mimeType: asset.mimeType ?? "application/octet-stream",
          originalName: path.basename(asset.path),
          s3Key,
          s3Bucket: env.S3_BUCKET,
          size: buffer.byteLength,
          hash: null,
          folder: "legacy-imports"
        }
      });
      uploaded.push({ id: created.id });
    }

    return uploaded;
  }
}

function normalizeLegacyPath(value: string) {
  const normalized = value.replace(/\\/g, "/").replace(/^\/+/, "");
  const parts = normalized.split("/").filter(Boolean);
  if (!parts.length || parts.some((part) => part === "." || part === "..")) {
    throw new BadRequestException("Resolved legacy asset path is not allowed.");
  }
  return parts.join("/");
}

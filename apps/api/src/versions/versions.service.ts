import { Injectable } from "@nestjs/common";
import { Prisma, VersionStatus } from "@prisma/client";

import type { AuthUser } from "../common/current-user.decorator";
import { toInputJson } from "../common/prisma-json";
import { mapPrismaError } from "../common/prisma-errors";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateVersionDto } from "./versions.dto";

const DIFF_FIELDS = [
  "grapesJson",
  "placeholders",
  "html",
  "css",
  "customCss",
  "customJs"
] as const;

@Injectable()
export class VersionsService {
  constructor(private readonly prisma: PrismaService) {}

  listForLanding(landingId: string) {
    return this.prisma.version.findMany({
      where: { landingId },
      orderBy: { versionNum: "desc" },
      include: { author: { select: { id: true, email: true, name: true, role: true } } }
    });
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
        await tx.landing.findUniqueOrThrow({ where: { id: landingId } });
        const latest = await tx.version.findFirst({
          where: { landingId },
          orderBy: { versionNum: "desc" },
          select: { versionNum: true }
        });

        const grapesJson = {
          assets: dto.assets,
          components: dto.components,
          styles: dto.styles
        };

        const version = await tx.version.create({
          data: {
            landingId,
            versionNum: (latest?.versionNum ?? 0) + 1,
            status: VersionStatus.AUTOSAVE,
            grapesJson: toInputJson(grapesJson) ?? Prisma.JsonNull,
            placeholders: toInputJson(dto.placeholderValues) ?? Prisma.JsonNull,
            html: dto.html,
            css: dto.css,
            customCss: dto.customCss,
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

  async rollback(id: string, user: AuthUser) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const source = await tx.version.findUniqueOrThrow({ where: { id } });
        const latest = await tx.version.findFirst({
          where: { landingId: source.landingId },
          orderBy: { versionNum: "desc" },
          select: { versionNum: true }
        });
        const rollback = await tx.version.create({
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
            message: `Rollback to version ${source.versionNum}`
          }
        });

        await tx.landing.update({
          where: { id: source.landingId },
          data: { currentVersionId: rollback.id }
        });

        return rollback;
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

    return {
      fromId,
      toId,
      fields: DIFF_FIELDS.map((field) => ({
        field,
        changed: JSON.stringify(from[field]) !== JSON.stringify(to[field]),
        from: from[field],
        to: to[field]
      }))
    };
  }
}

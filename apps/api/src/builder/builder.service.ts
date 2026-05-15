import { ForbiddenException, Injectable } from "@nestjs/common";
import { BuilderPageStatus, BuilderVersionStatus, Prisma, Role } from "@prisma/client";

import type { AuthUser } from "../common/current-user.decorator";
import { mapPrismaError } from "../common/prisma-errors";
import { PrismaService } from "../prisma/prisma.service";
import type {
  CreateBuilderPageDto,
  SaveBuilderDraftDto,
  UpdateBuilderPageDto
} from "./builder.dto";

export type BuilderStatusResponse = {
  name: "builder";
  status: "ok";
  timestamp: string;
};

const builderPageDetailSelect = {
  id: true,
  name: true,
  status: true,
  currentVersionId: true,
  html: true,
  css: true,
  components: true,
  styles: true,
  assets: true,
  design: true,
  device: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.BuilderPageSelect;

@Injectable()
export class BuilderService {
  constructor(private readonly prisma: PrismaService) {}

  getStatus(): BuilderStatusResponse {
    return {
      name: "builder",
      status: "ok",
      timestamp: new Date().toISOString()
    };
  }

  async latest(user: AuthUser) {
    const page = await this.prisma.builderPage.findFirst({
      where: {
        ownerId: user.id,
        deletedAt: null
      },
      select: builderPageDetailSelect,
      orderBy: { updatedAt: "desc" }
    });

    return page ? this.toDetail(page) : null;
  }

  async list(user: AuthUser) {
    const pages = await this.prisma.builderPage.findMany({
      where: {
        ownerId: user.id,
        deletedAt: null
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
        updatedAt: true
      },
      take: 24
    });

    return pages.map((page) => ({
      id: page.id,
      name: page.name,
      status: page.status,
      createdAt: page.createdAt,
      updatedAt: page.updatedAt
    }));
  }

  async create(dto: CreateBuilderPageDto, user: AuthUser) {
    try {
      const page = await this.prisma.builderPage.create({
        data: {
          name: dto.name?.trim() || "Untitled builder page",
          ownerId: user.id,
          status: BuilderPageStatus.DRAFT
        },
        select: builderPageDetailSelect
      });

      return this.toDetail(page);
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async get(id: string, user: AuthUser) {
    const page = await this.prisma.builderPage.findUniqueOrThrow({
      where: { id },
      select: {
        ...builderPageDetailSelect,
        ownerId: true
      }
    });

    this.assertCanRead(page.ownerId, user);

    return this.toDetail(page);
  }

  async update(id: string, dto: UpdateBuilderPageDto, user: AuthUser) {
    const page = await this.prisma.builderPage.findUniqueOrThrow({
      where: { id },
      select: { ownerId: true }
    });

    this.assertCanWrite(page.ownerId, user);

    try {
      const updated = await this.prisma.builderPage.update({
        where: { id },
        data: {
          name: dto.name?.trim(),
          status: dto.status
        },
        select: builderPageDetailSelect
      });

      return this.toDetail(updated);
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async saveDraft(id: string, dto: SaveBuilderDraftDto, user: AuthUser) {
    const page = await this.prisma.builderPage.findUniqueOrThrow({
      where: { id },
      select: { ownerId: true }
    });

    this.assertCanWrite(page.ownerId, user);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const versionCount = await tx.builderPageVersion.count({
          where: { builderPageId: id }
        });

        const version = await tx.builderPageVersion.create({
          data: {
            builderPageId: id,
            versionNum: versionCount + 1,
            status: BuilderVersionStatus.AUTOSAVE,
            html: dto.html,
            css: dto.css,
            components: this.toJson(dto.components),
            styles: this.toJson(dto.styles),
            assets: this.toJson(dto.assets),
            design: this.toJson(dto.design),
            device: dto.device,
            message: dto.message,
            authorId: user.id
          }
        });

        await tx.builderPage.update({
          where: { id },
          data: {
            currentVersionId: version.id,
            html: dto.html,
            css: dto.css,
            components: this.toJson(dto.components),
            styles: this.toJson(dto.styles),
            assets: this.toJson(dto.assets),
            design: this.toJson(dto.design),
            device: dto.device
          }
        });

        return {
          id: version.id,
          createdAt: version.createdAt,
          status: version.status,
          versionNum: version.versionNum
        };
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async versions(id: string, user: AuthUser) {
    const page = await this.prisma.builderPage.findUniqueOrThrow({
      where: { id },
      select: { ownerId: true }
    });

    this.assertCanRead(page.ownerId, user);

    const versions = await this.prisma.builderPageVersion.findMany({
      where: { builderPageId: id },
      orderBy: { versionNum: "desc" },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    });

    return versions.map((version) => ({
      id: version.id,
      versionNum: version.versionNum,
      status: version.status,
      message: version.message,
      createdAt: version.createdAt,
      author: version.author
    }));
  }

  async duplicate(id: string, user: AuthUser) {
    const source = await this.prisma.builderPage.findUniqueOrThrow({
      where: { id },
      include: {
        currentVersion: true
      }
    });

    this.assertCanRead(source.ownerId, user);

    try {
      const copy = await this.prisma.builderPage.create({
        data: {
          name: `${source.name} Copy`,
          status: BuilderPageStatus.DRAFT,
          ownerId: user.id,
          html: source.html,
          css: source.css,
          components: source.components ?? Prisma.JsonNull,
          styles: source.styles ?? Prisma.JsonNull,
          assets: source.assets ?? Prisma.JsonNull,
          design: source.design ?? Prisma.JsonNull,
          device: source.device
        },
        select: builderPageDetailSelect
      });

      if (source.currentVersion) {
        await this.saveDraft(
          copy.id,
          {
            html: source.currentVersion.html ?? source.html ?? undefined,
            css: source.currentVersion.css ?? source.css ?? undefined,
            components: source.currentVersion.components,
            styles: source.currentVersion.styles,
            assets:
              Array.isArray(source.currentVersion.assets) &&
              source.currentVersion.assets.every((item) => item !== null)
                ? (source.currentVersion.assets as unknown[])
                : undefined,
            design: source.currentVersion.design ?? source.design ?? undefined,
            device: this.toDevice(source.currentVersion.device ?? source.device),
            message: `Duplicated from ${source.name}`
          },
          user
        );
      }

      return this.get(copy.id, user);
    } catch (error) {
      mapPrismaError(error);
    }
  }

  private toDetail(
    page: Prisma.BuilderPageGetPayload<{ select: typeof builderPageDetailSelect }> & {
      currentVersionId?: string | null;
    }
  ) {
    return {
      id: page.id,
      name: page.name,
      status: page.status,
      currentVersionId: page.currentVersionId ?? null,
      html: page.html ?? undefined,
      css: page.css ?? undefined,
      components: page.components ?? undefined,
      design: page.design ?? undefined,
      styles: page.styles ?? undefined,
      assets:
        Array.isArray(page.assets) && page.assets.every((item) => item !== null)
          ? (page.assets as unknown[])
          : undefined,
      device: this.toDevice(page.device),
      createdAt: page.createdAt,
      updatedAt: page.updatedAt
    };
  }

  private assertCanRead(ownerId: string, user: AuthUser) {
    if (ownerId !== user.id && user.role !== Role.ADMIN && user.role !== Role.OWNER) {
      throw new ForbiddenException("You do not have access to this builder page.");
    }
  }

  private assertCanWrite(ownerId: string, user: AuthUser) {
    this.assertCanRead(ownerId, user);
  }

  private toDevice(value: string | null | undefined) {
    return value === "mobile" || value === "tablet" || value === "desktop"
      ? value
      : undefined;
  }

  private toJson(value: unknown) {
    return value === undefined ? Prisma.JsonNull : (value as Prisma.InputJsonValue);
  }
}

import { Injectable } from "@nestjs/common";
import { Prisma, WidgetStatus, WidgetType } from "@prisma/client";

import type { AuthUser } from "../common/current-user.decorator";
import { getPagination, listResponse } from "../common/pagination";
import { mapPrismaError } from "../common/prisma-errors";
import { PrismaService } from "../prisma/prisma.service";
import type {
  CreateWidgetDto,
  CreateWidgetVersionDto,
  UpdateWidgetDto,
  WidgetListQueryDto
} from "./widgets.dto";

@Injectable()
export class WidgetsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: WidgetListQueryDto) {
    const { skip, take, page, limit } = getPagination(query);
    const where: Prisma.WidgetWhereInput = {
      status: query.status,
      type: query.type,
      category: query.category,
      tags: query.tag ? { has: query.tag } : undefined,
      deletedAt: null,
      OR: query.search
        ? [
            { slug: { contains: query.search, mode: "insensitive" } },
            { name: { contains: query.search, mode: "insensitive" } },
            { description: { contains: query.search, mode: "insensitive" } }
          ]
        : undefined
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.widget.findMany({
        where,
        include: { versions: { where: { isLatest: true }, take: 1 } },
        skip,
        take,
        orderBy: { updatedAt: "desc" }
      }),
      this.prisma.widget.count({ where })
    ]);

    return listResponse(items, total, page, limit);
  }

  get(id: string) {
    return this.prisma.widget.findUniqueOrThrow({
      where: { id },
      include: { versions: { orderBy: { createdAt: "desc" } }, author: true }
    });
  }

  async create(dto: CreateWidgetDto, user: AuthUser) {
    try {
      return await this.prisma.widget.create({
        data: {
          ...dto,
          type: dto.type ?? WidgetType.VANILLA_JS,
          status: dto.status ?? WidgetStatus.DRAFT,
          authorId: user.id
        }
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async update(id: string, dto: UpdateWidgetDto) {
    try {
      return await this.prisma.widget.update({ where: { id }, data: dto });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async delete(id: string) {
    try {
      return await this.prisma.widget.update({
        where: { id },
        data: { deletedAt: new Date() }
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  listVersions(widgetId: string) {
    return this.prisma.widgetVersion.findMany({
      where: { widgetId },
      orderBy: { createdAt: "desc" }
    });
  }

  async createVersion(widgetId: string, dto: CreateWidgetVersionDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.widget.findUniqueOrThrow({ where: { id: widgetId } });

        if (dto.isLatest) {
          await tx.widgetVersion.updateMany({
            where: { widgetId },
            data: { isLatest: false }
          });
        }

        return tx.widgetVersion.create({
          data: {
            widgetId,
            version: dto.version,
            bundleUrl: dto.bundleUrl,
            bundleHash: dto.bundleHash,
            schema: dto.schema ?? Prisma.JsonNull,
            changelog: dto.changelog,
            isLatest: dto.isLatest ?? false
          }
        });
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async markLatest(versionId: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const version = await tx.widgetVersion.findUniqueOrThrow({
          where: { id: versionId }
        });
        await tx.widgetVersion.updateMany({
          where: { widgetId: version.widgetId },
          data: { isLatest: false }
        });

        return tx.widgetVersion.update({
          where: { id: versionId },
          data: { isLatest: true }
        });
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }
}

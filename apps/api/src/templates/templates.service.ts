import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { getPagination, listResponse } from "../common/pagination";
import { toInputJson } from "../common/prisma-json";
import { mapPrismaError } from "../common/prisma-errors";
import { PrismaService } from "../prisma/prisma.service";
import type {
  CreateTemplateDto,
  TemplateListQueryDto,
  UpdateTemplateDto
} from "./templates.dto";

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: TemplateListQueryDto) {
    const { skip, take, page, limit } = getPagination(query);
    const where: Prisma.TemplateWhereInput = {
      categoryId: query.categoryId,
      isPublic: query.isPublic,
      isActive: query.isActive,
      tags: query.tag ? { has: query.tag } : undefined,
      allowedGeos: query.geoId ? { some: { geoId: query.geoId } } : undefined,
      OR: query.search
        ? [
            { slug: { contains: query.search, mode: "insensitive" } },
            { name: { contains: query.search, mode: "insensitive" } },
            { description: { contains: query.search, mode: "insensitive" } }
          ]
        : undefined
    };
    const include = {
      allowedGeos: { include: { geo: true } },
      category: true,
      author: true
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.template.findMany({
        where,
        include,
        skip,
        take,
        orderBy: [{ updatedAt: "desc" }, { name: "asc" }]
      }),
      this.prisma.template.count({ where })
    ]);

    return listResponse(items, total, page, limit);
  }

  get(id: string) {
    return this.prisma.template.findUniqueOrThrow({
      where: { id },
      include: { allowedGeos: { include: { geo: true } }, category: true, author: true }
    });
  }

  async create(dto: CreateTemplateDto, authorId: string) {
    const { categoryId, geoIds, ...data } = dto;

    try {
      return await this.prisma.template.create({
        data: {
          ...data,
          grapesJson: toInputJson(data.grapesJson),
          placeholders: toInputJson(data.placeholders) ?? Prisma.JsonNull,
          blocksJson: toInputJson(data.blocksJson),
          author: { connect: { id: authorId } },
          category: categoryId ? { connect: { id: categoryId } } : undefined,
          allowedGeos: geoIds?.length
            ? {
                create: geoIds.map((geoId) => ({ geoId }))
              }
            : undefined
        },
        include: { allowedGeos: true }
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async update(id: string, dto: UpdateTemplateDto) {
    const { categoryId, geoIds, ...data } = dto;

    try {
      return await this.prisma.$transaction(async (tx) => {
        if (geoIds) {
          await tx.templateGeo.deleteMany({ where: { templateId: id } });
        }

        return tx.template.update({
          where: { id },
          data: {
            ...data,
            grapesJson: toInputJson(data.grapesJson),
            placeholders: toInputJson(data.placeholders),
            blocksJson: toInputJson(data.blocksJson),
            category:
              categoryId === undefined
                ? undefined
                : categoryId
                  ? { connect: { id: categoryId } }
                  : { disconnect: true },
            allowedGeos: geoIds
              ? {
                  create: geoIds.map((geoId) => ({ geoId }))
                }
              : undefined
          },
          include: { allowedGeos: true }
        });
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async delete(id: string) {
    try {
      return await this.prisma.template.delete({ where: { id } });
    } catch (error) {
      mapPrismaError(error);
    }
  }
}

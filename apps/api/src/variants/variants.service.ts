import { ConflictException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { getPagination, listResponse } from "../common/pagination";
import { mapPrismaError } from "../common/prisma-errors";
import { PrismaService } from "../prisma/prisma.service";
import type {
  CreateVariantDto,
  ReorderVariantsDto,
  UpdateVariantDto,
  VariantListQueryDto
} from "./variants.dto";

@Injectable()
export class VariantsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: VariantListQueryDto) {
    const { skip, take, page, limit } = getPagination(query);
    const where: Prisma.VariantWhereInput = {
      isActive: query.isActive,
      OR: query.search
        ? [
            { slug: { contains: query.search, mode: "insensitive" } },
            { name: { contains: query.search, mode: "insensitive" } }
          ]
        : undefined
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.variant.findMany({
        where,
        include: { _count: { select: { landings: true } } },
        skip,
        take,
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
      }),
      this.prisma.variant.count({ where })
    ]);

    return listResponse(items, total, page, limit);
  }

  get(id: string) {
    return this.prisma.variant.findUniqueOrThrow({
      where: { id },
      include: { _count: { select: { landings: true } } }
    });
  }

  async create(dto: CreateVariantDto) {
    try {
      return await this.prisma.variant.create({ data: dto });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async update(id: string, dto: UpdateVariantDto) {
    try {
      return await this.prisma.variant.update({ where: { id }, data: dto });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async delete(id: string) {
    const landingCount = await this.prisma.landing.count({
      where: { deletedAt: null, variantId: id }
    });

    if (landingCount > 0) {
      throw new ConflictException({
        landingCount,
        message: "Variant is used by active landings."
      });
    }

    try {
      return await this.prisma.variant.delete({ where: { id } });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async reorder(dto: ReorderVariantsDto) {
    await this.prisma.$transaction(
      dto.ids.map((id, index) =>
        this.prisma.variant.update({
          where: { id },
          data: { sortOrder: index * 10 }
        })
      )
    );

    return { count: dto.ids.length };
  }
}

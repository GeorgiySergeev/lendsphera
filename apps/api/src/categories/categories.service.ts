import { ConflictException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { getPagination, listResponse } from "../common/pagination";
import { mapPrismaError } from "../common/prisma-errors";
import { PrismaService } from "../prisma/prisma.service";
import type {
  CategoryListQueryDto,
  CreateCategoryDto,
  ReorderCategoriesDto,
  UpdateCategoryDto
} from "./categories.dto";

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: CategoryListQueryDto) {
    const { skip, take, page, limit } = getPagination(query);
    const where: Prisma.CategoryWhereInput = {
      isActive: query.isActive,
      OR: query.search
        ? [
            { slug: { contains: query.search, mode: "insensitive" } },
            { name: { contains: query.search, mode: "insensitive" } }
          ]
        : undefined
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.category.findMany({
        where,
        include: { _count: { select: { landings: true, templates: true } } },
        skip,
        take,
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
      }),
      this.prisma.category.count({ where })
    ]);

    return listResponse(items, total, page, limit);
  }

  get(id: string) {
    return this.prisma.category.findUniqueOrThrow({
      where: { id },
      include: { _count: { select: { landings: true, templates: true } } }
    });
  }

  async create(dto: CreateCategoryDto) {
    try {
      return await this.prisma.category.create({ data: dto });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async update(id: string, dto: UpdateCategoryDto) {
    try {
      return await this.prisma.category.update({ where: { id }, data: dto });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async delete(id: string) {
    const landingCount = await this.prisma.landing.count({
      where: { categoryId: id, deletedAt: null }
    });

    if (landingCount > 0) {
      throw new ConflictException({
        landingCount,
        message: "Category is used by active landings."
      });
    }

    try {
      return await this.prisma.category.delete({ where: { id } });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async reorder(dto: ReorderCategoriesDto) {
    await this.prisma.$transaction(
      dto.ids.map((id, index) =>
        this.prisma.category.update({
          where: { id },
          data: { sortOrder: index * 10 }
        })
      )
    );

    return { count: dto.ids.length };
  }
}

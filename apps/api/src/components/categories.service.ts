import { ConflictException, Injectable } from "@nestjs/common";

import { mapPrismaError } from "../common/prisma-errors";
import { PrismaService } from "../prisma/prisma.service";
import type {
  CreateCategoryDto,
  UpdateCategoryDto
} from "./dto/create-category.dto";

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  listActive() {
    return this.prisma.componentCategory.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
    });
  }

  async create(dto: CreateCategoryDto) {
    try {
      return await this.prisma.componentCategory.create({ data: dto });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async update(id: string, dto: UpdateCategoryDto) {
    try {
      return await this.prisma.componentCategory.update({
        where: { id },
        data: dto
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async delete(id: string) {
    const componentsCount = await this.prisma.component.count({
      where: { categoryId: id, deletedAt: null }
    });

    if (componentsCount > 0) {
      throw new ConflictException({
        componentsCount,
        message: "Component category has components."
      });
    }

    try {
      return await this.prisma.componentCategory.delete({ where: { id } });
    } catch (error) {
      mapPrismaError(error);
    }
  }
}

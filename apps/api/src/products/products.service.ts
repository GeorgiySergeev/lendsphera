import { Injectable } from "@nestjs/common";
import { AuditAction, Prisma } from "@prisma/client";

import { AuditService } from "../audit/audit.service";
import { mapPrismaError } from "../common/prisma-errors";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateProductDto } from "./dto/create-product.dto";
import type { ListProductsQueryDto } from "./dto/list-products-query.dto";
import type { UpdateProductDto } from "./dto/update-product.dto";

const productInclude = {
  category: true
} satisfies Prisma.ProductInclude;

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async list(query: ListProductsQueryDto) {
    const where: Prisma.ProductWhereInput = {
      archivedAt: query.includeArchived ? undefined : null,
      categoryId: query.category,
      OR: query.q
        ? [
            { slug: { contains: query.q, mode: "insensitive" } },
            { name: { contains: query.q, mode: "insensitive" } },
            { description: { contains: query.q, mode: "insensitive" } }
          ]
        : undefined
    };

    const items = await this.prisma.product.findMany({
      where,
      include: productInclude,
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
    return this.prisma.product.findUniqueOrThrow({
      where: { id },
      include: productInclude
    });
  }

  async create(dto: CreateProductDto, userId: string) {
    try {
      const data: Prisma.ProductUncheckedCreateInput = {
        slug: dto.slug,
        name: dto.name,
        description: dto.description,
        categoryId: dto.categoryId,
        defaultImage: dto.defaultImage,
        claimsKey: dto.claimsKey,
        meta: (dto.meta ?? {}) as Prisma.InputJsonValue
      };
      const product = await this.prisma.product.create({
        data,
        include: productInclude
      });

      await this.audit.log(AuditAction.CREATE, "product.create", product.id, userId, {
        diff: { created: true, slug: product.slug }
      });

      return product;
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async update(id: string, dto: UpdateProductDto) {
    try {
      const data: Prisma.ProductUncheckedUpdateInput = {
        slug: dto.slug,
        name: dto.name,
        description: dto.description,
        categoryId: dto.categoryId,
        defaultImage: dto.defaultImage,
        claimsKey: dto.claimsKey,
        meta: dto.meta as Prisma.InputJsonValue | undefined
      };
      return await this.prisma.product.update({
        where: { id },
        data,
        include: productInclude
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.product.update({
        where: { id },
        data: { archivedAt: new Date() }
      });

      return { success: true };
    } catch (error) {
      mapPrismaError(error);
    }
  }
}

import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { mapPrismaError } from "../common/prisma-errors";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateComponentDto } from "./dto/create-component.dto";
import type { CreateVariantDto, UpdateVariantDto } from "./dto/create-variant.dto";
import type { QueryComponentsDto } from "./dto/query-components.dto";
import type { UpdateComponentDto } from "./dto/update-component.dto";

const componentInclude = {
  category: true,
  _count: { select: { variants: true } }
} satisfies Prisma.ComponentInclude;

const detailInclude = {
  category: true,
  variants: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }] },
  _count: { select: { variants: true } }
} satisfies Prisma.ComponentInclude;

@Injectable()
export class ComponentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: QueryComponentsDto) {
    const page = query.page;
    const limit = query.limit;
    const where: Prisma.ComponentWhereInput = {
      deletedAt: null,
      categoryId: query.categoryId,
      isPublic: query.isPublic,
      isPinned: query.isPinned,
      tags: query.tags?.length ? { hasSome: query.tags } : undefined,
      OR: query.search
        ? [
            { name: { contains: query.search, mode: "insensitive" } },
            { description: { contains: query.search, mode: "insensitive" } },
            { tags: { has: query.search } }
          ]
        : undefined
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.component.findMany({
        where,
        include: componentInclude,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ [query.sortBy]: query.sortDir }, { name: "asc" }]
      }),
      this.prisma.component.count({ where })
    ]);

    return {
      data: items.map((item) => this.toListItem(item)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async get(id: string) {
    const component = await this.prisma.component.findFirstOrThrow({
      where: { id, deletedAt: null },
      include: detailInclude
    });

    return this.toDetail(component);
  }

  async create(dto: CreateComponentDto, authorId: string) {
    try {
      const component = await this.prisma.component.create({
        data: {
          ...dto,
          authorId,
          previewHeight: dto.previewHeight ?? 400,
          tags: dto.tags ?? []
        },
        include: detailInclude
      });

      return this.toDetail(component);
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async update(id: string, dto: UpdateComponentDto) {
    try {
      const component = await this.prisma.component.update({
        where: { id },
        data: dto,
        include: detailInclude
      });

      return this.toDetail(component);
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async delete(id: string) {
    try {
      await this.prisma.component.update({
        where: { id },
        data: { deletedAt: new Date() }
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async duplicate(id: string, authorId: string) {
    try {
      const source = await this.prisma.component.findFirstOrThrow({
        where: { id, deletedAt: null },
        include: { variants: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }] } }
      });
      const slug = await this.nextCopySlug(source.slug);

      const component = await this.prisma.component.create({
        data: {
          name: `${source.name} (copy)`,
          slug,
          description: source.description,
          html: source.html,
          css: source.css,
          previewBg: source.previewBg,
          previewDark: source.previewDark,
          previewHeight: source.previewHeight,
          categoryId: source.categoryId,
          tags: source.tags,
          isPinned: false,
          isPublic: source.isPublic,
          authorId,
          variants: {
            create: source.variants.map((variant, index) => ({
              name: variant.name,
              html: variant.html,
              css: variant.css,
              sortOrder: variant.sortOrder || index,
              isDefault: variant.isDefault
            }))
          }
        },
        include: detailInclude
      });

      return this.toDetail(component);
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async trackUsage(id: string) {
    try {
      await this.prisma.component.update({
        where: { id },
        data: { usageCount: { increment: 1 } }
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  listVariants(componentId: string) {
    return this.prisma.componentVariant.findMany({
      where: { componentId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
    });
  }

  async createVariant(componentId: string, dto: CreateVariantDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.component.findFirstOrThrow({ where: { id: componentId, deletedAt: null } });

        if (dto.isDefault) {
          await tx.componentVariant.updateMany({
            where: { componentId },
            data: { isDefault: false }
          });
        }

        const count = await tx.componentVariant.count({ where: { componentId } });

        return tx.componentVariant.create({
          data: {
            componentId,
            name: dto.name,
            html: dto.html,
            css: dto.css,
            isDefault: dto.isDefault ?? false,
            sortOrder: count * 10
          }
        });
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async updateVariant(componentId: string, variantId: string, dto: UpdateVariantDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.componentVariant.findFirstOrThrow({
          where: { id: variantId, componentId }
        });

        if (dto.isDefault) {
          await tx.componentVariant.updateMany({
            where: { componentId, id: { not: variantId } },
            data: { isDefault: false }
          });
        }

        return tx.componentVariant.update({
          where: { id: variantId },
          data: dto
        });
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async deleteVariant(componentId: string, variantId: string) {
    try {
      await this.prisma.componentVariant.delete({
        where: { id: variantId, componentId }
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  private toListItem(
    item: Prisma.ComponentGetPayload<{ include: typeof componentInclude }>
  ) {
    return {
      id: item.id,
      slug: item.slug,
      name: item.name,
      description: item.description ?? undefined,
      html: item.html.slice(0, 500),
      previewBg: item.previewBg ?? undefined,
      previewDark: item.previewDark,
      previewHeight: item.previewHeight,
      category: item.category,
      tags: item.tags,
      isPinned: item.isPinned,
      variantsCount: item._count.variants,
      usageCount: item.usageCount,
      updatedAt: item.updatedAt
    };
  }

  private toDetail(item: Prisma.ComponentGetPayload<{ include: typeof detailInclude }>) {
    return {
      ...this.toListItem(item),
      html: item.html,
      css: item.css ?? undefined,
      variants: item.variants
    };
  }

  private async nextCopySlug(slug: string) {
    const base = `${slug}-copy`;
    let candidate = base;
    let index = 2;

    while (await this.prisma.component.findUnique({ where: { slug: candidate } })) {
      candidate = `${base}-${index}`;
      index += 1;
    }

    return candidate;
  }
}

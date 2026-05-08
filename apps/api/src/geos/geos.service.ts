import { ConflictException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { getPagination, listResponse } from "../common/pagination";
import { toInputJson } from "../common/prisma-json";
import { mapPrismaError } from "../common/prisma-errors";
import { PrismaService } from "../prisma/prisma.service";
import type {
  CreateGeoDto,
  GeoListQueryDto,
  ImportGeosDto,
  ReorderGeosDto,
  UpdateGeoDto
} from "./geos.dto";

@Injectable()
export class GeosService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: GeoListQueryDto) {
    const { skip, take, page, limit } = getPagination(query);
    const where: Prisma.GeoWhereInput = {
      isActive: query.isActive,
      language: query.language,
      OR: query.search
        ? [
            { code: { contains: query.search, mode: "insensitive" } },
            { name: { contains: query.search, mode: "insensitive" } }
          ]
        : undefined
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.geo.findMany({
        where,
        include: { _count: { select: { landings: true, templates: true } } },
        skip,
        take,
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
      }),
      this.prisma.geo.count({ where })
    ]);

    return listResponse(items, total, page, limit);
  }

  get(id: string) {
    return this.prisma.geo.findUniqueOrThrow({
      where: { id },
      include: { _count: { select: { landings: true, templates: true } } }
    });
  }

  async create(dto: CreateGeoDto) {
    try {
      return await this.prisma.geo.create({
        data: {
          ...dto,
          metadata: toInputJson(dto.metadata)
        }
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async update(id: string, dto: UpdateGeoDto) {
    try {
      return await this.prisma.geo.update({
        where: { id },
        data: {
          ...dto,
          metadata: toInputJson(dto.metadata)
        }
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async delete(id: string) {
    const landingCount = await this.prisma.landing.count({
      where: { deletedAt: null, geoId: id }
    });

    if (landingCount > 0) {
      throw new ConflictException({
        message: "Geo is used by active landings.",
        landingCount
      });
    }

    try {
      return await this.prisma.geo.delete({ where: { id } });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async reorder(dto: ReorderGeosDto) {
    await this.prisma.$transaction(
      dto.ids.map((id, index) =>
        this.prisma.geo.update({
          where: { id },
          data: { sortOrder: index * 10 }
        })
      )
    );

    return { count: dto.ids.length };
  }

  async import(dto: ImportGeosDto) {
    const result = {
      created: 0,
      errors: [] as Array<{ code?: string; message: string; row: number }>,
      updated: 0
    };

    for (const [index, row] of dto.rows.entries()) {
      try {
        const existing = await this.prisma.geo.findUnique({
          where: { code: row.code }
        });

        await this.prisma.geo.upsert({
          where: { code: row.code },
          update: row,
          create: row
        });

        if (existing) {
          result.updated += 1;
        } else {
          result.created += 1;
        }
      } catch (error) {
        result.errors.push({
          code: row.code,
          message: error instanceof Error ? error.message : "Unable to import row.",
          row: index + 1
        });
      }
    }

    return result;
  }
}

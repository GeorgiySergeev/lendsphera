import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import type { AuthUser } from "../common/current-user.decorator";
import { getPagination, listResponse } from "../common/pagination";
import { mapPrismaError } from "../common/prisma-errors";
import { PrismaService } from "../prisma/prisma.service";
import type { AssetListQueryDto, CreateAssetDto, UpdateAssetDto } from "./assets.dto";

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: AssetListQueryDto) {
    const { skip, take, page, limit } = getPagination(query);
    const where: Prisma.AssetWhereInput = {
      deletedAt: null,
      landingId: query.landingId,
      type: query.type,
      folder: query.folder,
      tags: query.tag ? { has: query.tag } : undefined,
      OR: query.search
        ? [
            { originalName: { contains: query.search, mode: "insensitive" } },
            { s3Key: { contains: query.search, mode: "insensitive" } },
            { hash: { contains: query.search, mode: "insensitive" } }
          ]
        : undefined
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.asset.findMany({
        where,
        include: {
          landing: true,
          uploader: { select: { id: true, email: true, name: true, role: true } }
        },
        skip,
        take,
        orderBy: { createdAt: "desc" }
      }),
      this.prisma.asset.count({ where })
    ]);

    return listResponse(items, total, page, limit);
  }

  get(id: string) {
    return this.prisma.asset.findUniqueOrThrow({
      where: { id },
      include: {
        landing: true,
        uploader: { select: { id: true, email: true, name: true, role: true } }
      }
    });
  }

  async create(dto: CreateAssetDto, user: AuthUser) {
    try {
      return await this.prisma.asset.create({
        data: {
          ...dto,
          uploaderId: user.id
        }
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async update(id: string, dto: UpdateAssetDto) {
    try {
      return await this.prisma.asset.update({ where: { id }, data: dto });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async delete(id: string) {
    try {
      return await this.prisma.asset.update({
        where: { id },
        data: { deletedAt: new Date() }
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }
}

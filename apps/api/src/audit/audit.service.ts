import { Injectable } from "@nestjs/common";
import { AuditAction, Prisma } from "@prisma/client";

import { getPagination, listResponse } from "../common/pagination";
import { PrismaService } from "../prisma/prisma.service";
import type { AuditLogListQueryDto } from "./audit.dto";

@Injectable()
export class AuditService {
  private buffer: Prisma.AuditLogCreateManyInput[] = [];
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly prisma: PrismaService) {}

  record(entry: Prisma.AuditLogCreateManyInput): void {
    this.buffer.push(entry);
    if (!this.timer) {
      this.timer = setTimeout(() => {
        void this.flush();
      }, 50);
    }
  }

  private async flush(): Promise<void> {
    this.timer = null;
    if (!this.buffer.length) return;

    const batch = this.buffer.splice(0);
    await this.prisma.auditLog.createMany({
      data: batch,
      skipDuplicates: true
    });
  }

  async log(
    action: AuditAction,
    entity: string,
    entityId: string,
    userId: string | null,
    metadata?: {
      diff?: unknown;
      ip?: string;
      userAgent?: string;
    }
  ) {
    return this.prisma.auditLog.create({
      data: {
        action,
        entity,
        entityId,
        userId,
        diff: metadata?.diff ? (metadata.diff as Prisma.InputJsonValue) : undefined,
        ip: metadata?.ip,
        userAgent: metadata?.userAgent
      }
    });
  }

  async list(query: AuditLogListQueryDto) {
    const { skip, take, page, limit } = getPagination(query);

    const where: Prisma.AuditLogWhereInput = {
      action: query.action,
      entity: query.entity,
      entityId: query.entityId,
      userId: query.userId,
      createdAt:
        query.startDate || query.endDate
          ? {
              gte: query.startDate ? new Date(query.startDate) : undefined,
              lte: query.endDate ? new Date(query.endDate) : undefined
            }
          : undefined
    };

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              avatarUrl: true
            }
          }
        }
      }),
      this.prisma.auditLog.count({ where })
    ]);

    return listResponse(items, total, page, limit);
  }

  async listByLanding(landingId: string, query: AuditLogListQueryDto) {
    const { skip, take, page, limit } = getPagination(query);

    const where: Prisma.AuditLogWhereInput = {
      entity: "Landing",
      entityId: landingId,
      action: query.action,
      userId: query.userId,
      createdAt:
        query.startDate || query.endDate
          ? {
              gte: query.startDate ? new Date(query.startDate) : undefined,
              lte: query.endDate ? new Date(query.endDate) : undefined
            }
          : undefined
    };

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              avatarUrl: true
            }
          }
        }
      }),
      this.prisma.auditLog.count({ where })
    ]);

    return listResponse(items, total, page, limit);
  }
}

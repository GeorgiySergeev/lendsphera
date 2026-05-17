import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger
} from "@nestjs/common";
import { AuditAction, LandingStatus, Prisma, Role, VersionStatus } from "@prisma/client";

import { AuditService } from "../audit/audit.service";
import type { AuthUser } from "../common/current-user.decorator";
import { getPagination, listResponse } from "../common/pagination";
import { toInputJson } from "../common/prisma-json";
import { mapPrismaError } from "../common/prisma-errors";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";
import type {
  BulkLandingDeleteDto,
  BulkLandingStatusDto,
  CreateLandingDto,
  DuplicateLandingDto,
  LandingListQueryDto,
  LandingNameAvailabilityQueryDto,
  LandingPublicIdSuggestionQueryDto,
  LockLandingDto,
  UpdateLandingDto
} from "./landings.dto";

@Injectable()
export class LandingsService {
  private readonly logger = new Logger(LandingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService
  ) {}

  async list(query: LandingListQueryDto) {
    const { skip, take, page, limit } = getPagination(query);
    const geoFilters = this.parseListFilter(query.geo ?? query.geoCode);
    const search = query.q ?? query.search;
    const where: Prisma.LandingWhereInput = {
      deletedAt: query.includeDeleted ? undefined : null,
      status: query.status,
      productId: query.productId,
      legacyFrom: query.origin
        ? {
            source: {
              equals: query.origin as Prisma.EnumLegacySourceFilter["equals"]
            }
          }
        : undefined,
      geo: geoFilters.length
        ? {
            OR: [
              { id: { in: geoFilters } },
              { code: { in: geoFilters, mode: "insensitive" } }
            ]
          }
        : undefined,
      category: query.category
        ? {
            OR: [
              { id: query.category },
              { slug: { equals: query.category, mode: "insensitive" } }
            ]
          }
        : undefined,
      variant: query.variant
        ? {
            OR: [
              { id: query.variant },
              { slug: { equals: query.variant, mode: "insensitive" } }
            ]
          }
        : undefined,
      OR: search
        ? [
            { publicId: { contains: search, mode: "insensitive" } },
            { name: { contains: search, mode: "insensitive" } },
            { slug: { contains: search, mode: "insensitive" } },
            { notes: { contains: search, mode: "insensitive" } }
          ]
        : undefined
    };

    const include = {
      geo: true,
      category: true,
      variant: true,
      template: true,
      owner: { select: { id: true, email: true, name: true, role: true } },
      currentVersion: true
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.landing.findMany({
        where,
        include,
        skip,
        take,
        orderBy: { updatedAt: "desc" }
      }),
      this.prisma.landing.count({ where })
    ]);

    return listResponse(items, total, page, limit);
  }

  get(id: string) {
    return this.prisma.landing.findUniqueOrThrow({
      where: { id },
      include: {
        geo: true,
        category: true,
        variant: true,
        template: true,
        owner: { select: { id: true, email: true, name: true, role: true } },
        currentVersion: true,
        versions: { orderBy: { versionNum: "desc" }, take: 5 }
      }
    });
  }

  async editor(id: string) {
    const landing = await this.prisma.landing.findUniqueOrThrow({
      where: { id },
      include: {
        template: true,
        currentVersion: true
      }
    });

    const doc: Record<string, any> = {
      template: landing.template
        ? {
            id: landing.template.id,
            name: landing.template.name,
            schema: landing.template.placeholders
          }
        : null,
      templateHtml: landing.template?.baseHtml
    };

    if (landing.currentVersion) {
      const v = landing.currentVersion;
      doc.html = v.html;
      doc.css = v.css;
      doc.customCss = v.customCss;
      doc.placeholderValues = v.placeholders;
      const grapesJson = v.grapesJson as any;
      if (grapesJson) {
        doc.assets = grapesJson.assets;
        doc.components = grapesJson.components;
        doc.layout = grapesJson.layout;
        doc.styles = grapesJson.styles;
      }
    }

    return doc;
  }

  async nameAvailability(query: LandingNameAvailabilityQueryDto) {
    const name = query.name.trim();
    const existing = await this.findActiveLandingByName(name);

    return { available: !existing, name };
  }

  async publicIdSuggestion(query: LandingPublicIdSuggestionQueryDto) {
    const [geo, category, variant] = await Promise.all([
      this.prisma.geo.findUniqueOrThrow({ where: { id: query.geoId } }),
      this.prisma.category.findUniqueOrThrow({ where: { id: query.categoryId } }),
      this.prisma.variant.findUniqueOrThrow({ where: { id: query.variantId } })
    ]);
    const base = [
      this.slugSegment(geo.code),
      this.slugSegment(category.slug),
      this.slugSegment(variant.slug)
    ].join("-");
    const existing = await this.prisma.landing.findMany({
      where: {
        publicId: { startsWith: base, mode: "insensitive" }
      },
      select: { publicId: true }
    });
    const pattern = new RegExp(`^${this.escapeRegex(base)}-(\\d+)$`, "i");
    const highest = existing.reduce((max, landing) => {
      const match = pattern.exec(landing.publicId);

      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);
    const nextNumber = highest + 1;

    return {
      base,
      nextNumber,
      publicId: `${base}-${nextNumber}`
    };
  }

  async create(dto: CreateLandingDto, user: AuthUser) {
    const name = dto.name.trim();
    const existing = await this.findActiveLandingByName(name);

    if (existing) {
      throw new ConflictException("Landing name is already in use.");
    }

    try {
      return await this.prisma.landing.create({
        data: {
          ...dto,
          name,
          publicId: dto.publicId ?? this.createPublicId(dto.slug),
          ownerId: user.id,
          status: dto.status ?? LandingStatus.DRAFT,
          pixels: toInputJson(dto.pixels),
          postbacks: toInputJson(dto.postbacks),
          seoMeta: toInputJson(dto.seoMeta),
          settings: toInputJson(dto.settings)
        }
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async update(id: string, dto: UpdateLandingDto, user: AuthUser) {
    const current = await this.prisma.landing.findUniqueOrThrow({
      where: { id },
      include: { currentVersion: true }
    });
    const nextStatus = dto.status;
    const statusChanged = Boolean(nextStatus && nextStatus !== current.status);
    if (statusChanged && nextStatus) {
      this.assertStatusTransition(current.status, nextStatus, user.role);
      if (
        nextStatus === LandingStatus.PUBLISHED &&
        !(dto.templateId ?? current.templateId)
      ) {
        throw new ConflictException("Cannot publish landing without templateId.");
      }
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const updated = await tx.landing.update({
          where: { id },
          data: {
            ...dto,
            pixels: toInputJson(dto.pixels),
            postbacks: toInputJson(dto.postbacks),
            seoMeta: toInputJson(dto.seoMeta),
            settings: toInputJson(dto.settings),
            publishedAt:
              statusChanged && nextStatus === LandingStatus.PUBLISHED
                ? new Date()
                : undefined
          } as Prisma.LandingUncheckedUpdateInput
        });

        if (statusChanged && nextStatus) {
          await tx.auditLog.create({
            data: {
              action: AuditAction.UPDATE,
              entity: "Landing",
              entityId: id,
              userId: user.id,
              diff: {
                field: "status",
                old: current.status,
                new: nextStatus
              } as Prisma.InputJsonValue
            }
          });

          if (nextStatus === LandingStatus.PUBLISHED) {
            const highest = await tx.version.findFirst({
              where: { landingId: id },
              orderBy: { versionNum: "desc" },
              select: { versionNum: true }
            });
            const nextVersion = (highest?.versionNum ?? 0) + 1;
            const baseVersion = current.currentVersion;
            const createdVersion = await tx.version.create({
              data: {
                landingId: id,
                versionNum: nextVersion,
                status: VersionStatus.MANUAL,
                grapesJson: (baseVersion?.grapesJson ?? {}) as Prisma.InputJsonValue,
                placeholders: (baseVersion?.placeholders ?? {}) as Prisma.InputJsonValue,
                html: baseVersion?.html,
                css: baseVersion?.css,
                customCss: baseVersion?.customCss,
                customJs: baseVersion?.customJs,
                snapshotS3Key: baseVersion?.snapshotS3Key,
                snapshotSize: baseVersion?.snapshotSize,
                authorId: user.id,
                message: "Auto-versioned on publish"
              }
            });

            await tx.landing.update({
              where: { id },
              data: { currentVersionId: createdVersion.id }
            });
          }
        }

        return updated;
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async softDelete(id: string) {
    try {
      return await this.prisma.landing.update({
        where: { id },
        data: { deletedAt: new Date() }
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async bulkUpdateStatus(dto: BulkLandingStatusDto) {
    const result = await this.prisma.landing.updateMany({
      where: { id: { in: dto.ids }, deletedAt: null },
      data: { status: dto.status }
    });

    return { count: result.count };
  }

  async bulkSoftDelete(dto: BulkLandingDeleteDto) {
    const result = await this.prisma.landing.updateMany({
      where: { id: { in: dto.ids }, deletedAt: null },
      data: { deletedAt: new Date() }
    });

    return { count: result.count };
  }

  async versions(id: string, query: LandingListQueryDto) {
    const { skip, take, page, limit } = getPagination(query);
    const where: Prisma.VersionWhereInput = { landingId: id };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.version.findMany({
        where,
        skip,
        take,
        orderBy: { versionNum: "desc" }
      }),
      this.prisma.version.count({ where })
    ]);

    return listResponse(items, total, page, limit);
  }

  async duplicate(id: string, dto: DuplicateLandingDto, user: AuthUser) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const source = await tx.landing.findUniqueOrThrow({
          where: { id },
          include: {
            currentVersion: true,
            versions: { orderBy: { versionNum: "desc" }, take: 1 }
          }
        });
        const suffix = Date.now().toString(36);
        const versionToCopy = source.currentVersion ?? source.versions[0];
        const copied = await tx.landing.create({
          data: {
            publicId: `${source.publicId}-copy-${suffix}`,
            name: `${source.name} Copy`,
            slug: `${source.slug}-copy-${suffix}`,
            geoId: dto.geoId ?? source.geoId,
            categoryId: source.categoryId,
            variantId: source.variantId,
            templateId: source.templateId,
            status: LandingStatus.DRAFT,
            ownerId: user.id,
            pixels: source.pixels ?? Prisma.JsonNull,
            postbacks: source.postbacks ?? Prisma.JsonNull,
            seoMeta: source.seoMeta ?? Prisma.JsonNull,
            settings: source.settings ?? Prisma.JsonNull,
            tags: source.tags,
            notes: source.notes
          }
        });

        if (versionToCopy) {
          const version = await tx.version.create({
            data: {
              landingId: copied.id,
              versionNum: 1,
              status: VersionStatus.MANUAL,
              grapesJson: versionToCopy.grapesJson ?? Prisma.JsonNull,
              placeholders: versionToCopy.placeholders ?? Prisma.JsonNull,
              html: versionToCopy.html,
              css: versionToCopy.css,
              customCss: versionToCopy.customCss,
              customJs: versionToCopy.customJs,
              snapshotS3Key: versionToCopy.snapshotS3Key,
              snapshotSize: versionToCopy.snapshotSize,
              authorId: user.id,
              message: `Duplicated from ${source.publicId}`
            }
          });

          await tx.landing.update({
            where: { id: copied.id },
            data: { currentVersionId: version.id }
          });
        }

        return tx.landing.findUniqueOrThrow({
          where: { id: copied.id },
          include: { currentVersion: true }
        });
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  async lock(id: string, dto: LockLandingDto, user: AuthUser) {
    await this.prisma.landing.findUniqueOrThrow({ where: { id } });
    const now = new Date();
    const ttlSeconds = dto.ttlMinutes * 60;
    const lockExpires = new Date(now.getTime() + ttlSeconds * 1000);

    // ============ ATTEMPT 1: Try to acquire a new lock (atomic SET NX EX) ============
    const lockAcquired = await this.redis.acquireLock(id, user.id, ttlSeconds);

    if (lockAcquired) {
      // Successfully acquired — persist lock state to Postgres.
      try {
        const updated = await this.prisma.landing.update({
          where: { id },
          data: {
            lockedById: user.id,
            lockedAt: now,
            lockExpires
          }
        });

        await this.audit.log(AuditAction.UPDATE, "Landing", id, user.id, {
          diff: { action: "lock", ttlMinutes: dto.ttlMinutes, isNewAcquisition: true }
        });

        return updated;
      } catch (dbError) {
        // Rollback Redis lock if Postgres write fails to maintain consistency.
        await this.redis.releaseLock(id, user.id);
        throw dbError;
      }
    }

    // ============ ATTEMPT 2: Re-entrant lock — refresh if already owner ============
    const currentOwner = await this.redis.getLockOwner(id);

    if (currentOwner === user.id) {
      // Atomic refresh via Lua — safe against the race condition where
      // the lock expires and another user acquires it between GET and EXPIRE.
      const refreshed = await this.redis.refreshLock(id, user.id, ttlSeconds);

      if (refreshed) {
        const updated = await this.prisma.landing.update({
          where: { id },
          data: { lockExpires }
        });

        await this.audit.log(AuditAction.UPDATE, "Landing", id, user.id, {
          diff: { action: "lock_refreshed", ttlMinutes: dto.ttlMinutes }
        });

        return updated;
      }

      // Refresh failed: lock expired and was grabbed by someone else
      // between getLockOwner() and refreshLock().
      throw new ConflictException(
        "Lock ownership changed during refresh. Please try again."
      );
    }

    // ============ DENY: Another user owns the lock ============
    throw new ConflictException(
      `Landing is locked by user ${currentOwner ?? "unknown"}. Try again later.`
    );
  }

  async refreshLock(id: string, user: AuthUser) {
    const ttlSeconds = 120;
    const refreshed = await this.redis.refreshLock(id, user.id, ttlSeconds);

    if (!refreshed) {
      throw new ConflictException("Lock not owned by user or expired.");
    }

    const lockExpires = new Date(Date.now() + ttlSeconds * 1000);
    await this.prisma.landing.update({
      where: { id },
      data: { lockExpires }
    });

    const ttl = await this.redis.getLockTTL(id);
    return { success: true, ttl };
  }

  async unlock(id: string, user: AuthUser) {
    const landing = await this.prisma.landing.findUniqueOrThrow({ where: { id } });
    const isOwner = landing.lockedById === user.id;
    const isPrivileged = user.role === Role.ADMIN || user.role === Role.OWNER;
    const canUnlock = !landing.lockedById || isOwner || isPrivileged;

    if (!canUnlock) {
      throw new ForbiddenException(
        "Only the lock owner or an admin can unlock this landing."
      );
    }

    // Atomic release via Lua — only deletes if the key value matches userId.
    // For admin/owner force-unlock of another user's lock, the Lua script
    // will return false (userId mismatch), but we still clear Postgres state.
    const released = await this.redis.releaseLock(id, user.id);

    if (!released && landing.lockedById && isPrivileged && !isOwner) {
      // Privileged user force-unlocking another user's lock:
      // release using the actual owner's ID for atomic correctness.
      await this.redis.releaseLock(id, landing.lockedById);
      this.logger.warn(
        `Force-unlock by ${user.role} user=${user.id} for landing=${id} owned by ${landing.lockedById}`
      );
    }

    // Clear Postgres lock state regardless of Redis result.
    const updated = await this.prisma.landing.update({
      where: { id },
      data: {
        lockedById: null,
        lockedAt: null,
        lockExpires: null
      }
    });

    await this.audit.log(AuditAction.UPDATE, "Landing", id, user.id, {
      diff: { action: "unlock", wasForced: isPrivileged && !isOwner }
    });

    return updated;
  }

  private createPublicId(slug: string) {
    return `${slug}-${Date.now().toString(36)}`;
  }

  private parseListFilter(value?: string) {
    return (
      value
        ?.split(",")
        .map((item) => item.trim())
        .filter(Boolean) ?? []
    );
  }

  private findActiveLandingByName(name: string) {
    return this.prisma.landing.findFirst({
      where: {
        deletedAt: null,
        name: { equals: name, mode: "insensitive" }
      },
      select: { id: true }
    });
  }

  private slugSegment(value: string) {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  private escapeRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  private assertStatusTransition(from: LandingStatus, to: LandingStatus, role: Role) {
    if (from === to) return;

    const isPrivileged = role === Role.ADMIN || role === Role.OWNER;
    if (
      (to === LandingStatus.PUBLISHED || to === LandingStatus.ARCHIVED) &&
      !isPrivileged
    ) {
      throw new ForbiddenException("Only ADMIN or OWNER can publish/archive landings.");
    }

    const allowed: Record<LandingStatus, LandingStatus[]> = {
      [LandingStatus.DRAFT]: [LandingStatus.IN_REVIEW],
      [LandingStatus.IN_REVIEW]: [LandingStatus.DRAFT, LandingStatus.PUBLISHED],
      [LandingStatus.PUBLISHED]: [LandingStatus.ARCHIVED],
      [LandingStatus.ARCHIVED]: []
    };

    if (!allowed[from]?.includes(to)) {
      throw new ConflictException(`Invalid landing status transition: ${from} -> ${to}`);
    }
  }
}

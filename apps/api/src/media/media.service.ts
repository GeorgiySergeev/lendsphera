import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Asset, AssetType, MediaFolder, Prisma } from "@prisma/client";
import type { Response } from "express";
import sizeOf from "image-size";

import { AuthUser } from "../common/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import {
  BulkDeleteAssetsDto,
  CreateFolderDto,
  MediaListQueryDto,
  MoveAssetsDto,
  MoveFolderDto,
  RenameFolderDto,
  UpdateAssetDto
} from "./media.dto";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function sanitize(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9.\-_]/g, "-");
}

function detectAssetType(mimeType: string): AssetType {
  if (mimeType.startsWith("image/")) return AssetType.IMAGE;
  if (mimeType.startsWith("video/")) return AssetType.VIDEO;
  if (mimeType.startsWith("font/") || mimeType.startsWith("application/font"))
    return AssetType.FONT;
  if (
    mimeType === "application/pdf" ||
    mimeType === "application/msword" ||
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType.startsWith("text/")
  )
    return AssetType.DOCUMENT;
  if (
    mimeType === "application/zip" ||
    mimeType === "application/x-tar" ||
    mimeType === "application/gzip" ||
    mimeType === "application/x-gzip"
  )
    return AssetType.ARCHIVE;
  return AssetType.OTHER;
}

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService
  ) {}

  private async withSignedUrl<T extends Asset>(asset: T): Promise<T> {
    return {
      ...asset,
      url: await this.storage.getSignedUrl(asset.s3Key)
    };
  }

  private assetAccessWhere(user: AuthUser): Prisma.AssetWhereInput {
    return {
      OR: [{ uploaderId: user.id }, { landing: { is: { ownerId: user.id } } }]
    };
  }

  /* ─────── FOLDER METHODS ─────── */

  async listFolders(
    parentId: string | undefined,
    user: AuthUser
  ): Promise<(MediaFolder & { childCount: number })[]> {
    const folders = await this.prisma.mediaFolder.findMany({
      where: {
        parentId: parentId ?? null,
        ownerId: user.id,
        deletedAt: null
      },
      orderBy: { name: "asc" }
    });

    const counts = await this.prisma.mediaFolder.groupBy({
      by: ["parentId"],
      where: {
        parentId: { in: folders.map((f) => f.id) },
        deletedAt: null
      },
      _count: { parentId: true }
    });

    const countMap = new Map<string, number>();
    for (const c of counts) {
      if (c.parentId) countMap.set(c.parentId, c._count.parentId);
    }

    return folders.map((f) => ({
      ...f,
      childCount: countMap.get(f.id) ?? 0
    }));
  }

  async createFolder(dto: CreateFolderDto, user: AuthUser): Promise<MediaFolder> {
    if (dto.parentId) {
      const parent = await this.prisma.mediaFolder.findFirst({
        where: { id: dto.parentId, deletedAt: null }
      });
      if (!parent) throw new NotFoundException("Parent folder not found");
    }

    let slug = slugify(dto.name);
    const existing = await this.prisma.mediaFolder.findMany({
      where: { parentId: dto.parentId ?? null, slug: { startsWith: slug } }
    });

    if (existing.length > 0) {
      let suffix = 2;
      const taken = new Set(existing.map((f) => f.slug));
      while (taken.has(slug)) {
        slug = `${slugify(dto.name)}-${suffix}`;
        suffix++;
      }
    }

    return this.prisma.mediaFolder.create({
      data: {
        name: dto.name,
        slug,
        parentId: dto.parentId ?? null,
        ownerId: user.id
      }
    });
  }

  async renameFolder(
    id: string,
    dto: RenameFolderDto,
    user: AuthUser
  ): Promise<MediaFolder> {
    const folder = await this.prisma.mediaFolder.findFirst({
      where: { id, deletedAt: null, ownerId: user.id }
    });
    if (!folder) throw new NotFoundException("Folder not found");

    let slug = slugify(dto.name);
    const siblings = await this.prisma.mediaFolder.findMany({
      where: {
        parentId: folder.parentId,
        deletedAt: null,
        id: { not: id },
        slug: { startsWith: slug }
      }
    });

    if (siblings.length > 0) {
      let suffix = 2;
      const taken = new Set(siblings.map((f) => f.slug));
      while (taken.has(slug)) {
        slug = `${slugify(dto.name)}-${suffix}`;
        suffix++;
      }
    }

    return this.prisma.mediaFolder.update({
      where: { id },
      data: { name: dto.name, slug }
    });
  }

  async deleteFolder(id: string, user: AuthUser): Promise<void> {
    const folder = await this.prisma.mediaFolder.findFirst({
      where: { id, deletedAt: null, ownerId: user.id }
    });
    if (!folder) throw new NotFoundException("Folder not found");

    const now = new Date();

    const recurseDelete = async (parentId: string) => {
      const children = await this.prisma.mediaFolder.findMany({
        where: { parentId, deletedAt: null }
      });
      for (const child of children) {
        await recurseDelete(child.id);
        await this.prisma.mediaFolder.update({
          where: { id: child.id },
          data: { deletedAt: now }
        });
      }
    };

    await recurseDelete(id);

    await this.prisma.mediaFolder.update({
      where: { id },
      data: { deletedAt: now }
    });

    await this.prisma.asset.updateMany({
      where: { folderId: id, deletedAt: null },
      data: { deletedAt: now }
    });
  }

  async moveFolder(id: string, dto: MoveFolderDto, user: AuthUser): Promise<MediaFolder> {
    if (dto.parentId === id) {
      throw new BadRequestException("A folder cannot be moved into itself");
    }

    if (dto.parentId) {
      const parent = await this.prisma.mediaFolder.findFirst({
        where: { id: dto.parentId, deletedAt: null }
      });
      if (!parent) throw new NotFoundException("Parent folder not found");
    }

    const folder = await this.prisma.mediaFolder.findFirst({
      where: { id, deletedAt: null, ownerId: user.id }
    });
    if (!folder) throw new NotFoundException("Folder not found");

    return this.prisma.mediaFolder.update({
      where: { id },
      data: { parentId: dto.parentId ?? null }
    });
  }

  /* ─────── ASSET METHODS ─────── */

  async listMedia(
    query: MediaListQueryDto,
    user: AuthUser
  ): Promise<{
    items: Asset[];
    meta: { total: number; page: number; limit: number; pageCount: number };
  }> {
    const where: Prisma.AssetWhereInput = {
      deletedAt: null,
      ...(query.landingId ? this.assetAccessWhere(user) : { uploaderId: user.id })
    };

    if (query.folderId !== undefined) {
      where.folderId = query.folderId ?? null;
    }

    if (query.landingId) {
      where.landingId = query.landingId;
    }

    if (query.muted !== undefined) {
      where.isMuted = query.muted;
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.search) {
      where.originalName = { contains: query.search, mode: "insensitive" };
    }

    const [total, items] = await Promise.all([
      this.prisma.asset.count({ where }),
      this.prisma.asset.findMany({
        where,
        include: {
          uploader: { select: { id: true, name: true, email: true } }
        },
        orderBy: { [query.sortBy]: query.sortOrder },
        skip: (query.page - 1) * query.limit,
        take: query.limit
      })
    ]);

    return {
      items: await Promise.all(items.map((item) => this.withSignedUrl(item))),
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        pageCount: Math.ceil(total / query.limit)
      }
    };
  }

  async uploadAsset(
    file: Express.Multer.File,
    folderId: string | undefined,
    landingId: string | undefined,
    user: AuthUser
  ): Promise<Asset> {
    if (folderId) {
      const folder = await this.prisma.mediaFolder.findFirst({
        where: { id: folderId, deletedAt: null }
      });
      if (!folder) throw new NotFoundException("Folder not found");
    }

    if (landingId) {
      const landing = await this.prisma.landing.findFirst({
        where: { id: landingId, ownerId: user.id }
      });
      if (!landing) throw new NotFoundException("Landing not found");
    }

    const assetType = detectAssetType(file.mimetype);
    const s3Key = `media/${user.id}/${Date.now()}-${sanitize(file.originalname)}`;

    await this.storage.putObject({
      key: s3Key,
      body: file.buffer,
      contentType: file.mimetype
    });

    let width: number | undefined;
    let height: number | undefined;

    if (assetType === AssetType.IMAGE) {
      try {
        const dims = sizeOf(file.buffer);
        width = dims.width;
        height = dims.height;
      } catch {
        // ignore — not all image buffers are readable
      }
    }

    const asset = await this.prisma.asset.create({
      data: {
        type: assetType,
        mimeType: file.mimetype,
        originalName: file.originalname,
        s3Key,
        s3Bucket: this.storage.bucket,
        url: null,
        size: file.size,
        width,
        height,
        landingId: landingId ?? null,
        uploaderId: user.id,
        folderId: folderId ?? null
      }
    });

    return this.withSignedUrl(asset);
  }

  async deleteAssets(dto: BulkDeleteAssetsDto, user: AuthUser): Promise<void> {
    const assets = await this.prisma.asset.findMany({
      where: {
        id: { in: dto.assetIds },
        deletedAt: null,
        ...this.assetAccessWhere(user)
      }
    });

    if (assets.length === 0) throw new NotFoundException("Assets not found");

    await this.prisma.asset.updateMany({
      where: { id: { in: assets.map((a) => a.id) } },
      data: { deletedAt: new Date() }
    });

    for (const asset of assets) {
      await this.storage.deleteObject(asset.s3Key);
    }
  }

  async moveAssets(dto: MoveAssetsDto, user: AuthUser): Promise<void> {
    if (dto.folderId) {
      const folder = await this.prisma.mediaFolder.findFirst({
        where: { id: dto.folderId, deletedAt: null }
      });
      if (!folder) throw new NotFoundException("Folder not found");
    }

    await this.prisma.asset.updateMany({
      where: {
        id: { in: dto.assetIds },
        deletedAt: null,
        ...this.assetAccessWhere(user)
      },
      data: { folderId: dto.folderId ?? null }
    });
  }

  async updateAsset(id: string, dto: UpdateAssetDto, user: AuthUser): Promise<Asset> {
    const asset = await this.prisma.asset.findFirst({
      where: { id, deletedAt: null, ...this.assetAccessWhere(user) }
    });
    if (!asset) throw new NotFoundException("Asset not found");

    if (dto.folderId !== undefined && dto.folderId !== null) {
      const folder = await this.prisma.mediaFolder.findFirst({
        where: { id: dto.folderId, deletedAt: null }
      });
      if (!folder) throw new NotFoundException("Folder not found");
    }

    const updated = await this.prisma.asset.update({
      where: { id },
      data: {
        originalName:
          dto.originalName !== undefined ? dto.originalName.trim() : undefined,
        isMuted: dto.isMuted,
        tags: dto.tags !== undefined ? dto.tags : undefined,
        folderId: dto.folderId !== undefined ? (dto.folderId ?? null) : undefined
      }
    });

    return this.withSignedUrl(updated);
  }

  async getAsset(id: string, user: AuthUser): Promise<Asset> {
    const asset = await this.prisma.asset.findFirst({
      where: { id, deletedAt: null, ...this.assetAccessWhere(user) }
    });
    if (!asset) throw new NotFoundException("Asset not found");
    return this.withSignedUrl(asset);
  }

  async streamAssetContent(
    id: string,
    user: AuthUser,
    response: Response,
    download = false
  ): Promise<void> {
    const asset = await this.prisma.asset.findFirst({
      where: { id, deletedAt: null, ...this.assetAccessWhere(user) }
    });
    if (!asset) throw new NotFoundException("Asset not found");

    const buffer = await this.storage.getObjectBuffer(asset.s3Key);
    const disposition = download ? "attachment" : "inline";

    response.setHeader("Content-Type", asset.mimeType);
    response.setHeader(
      "Content-Disposition",
      `${disposition}; filename="${encodeURIComponent(asset.originalName)}"`
    );
    response.setHeader("Cache-Control", "private, max-age=3600");
    response.send(buffer);
  }
}

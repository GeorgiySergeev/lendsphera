import { AssetType } from "@prisma/client";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";

/* ───────── FOLDER DTOs ───────── */

export const createFolderSchema = z.object({
  name: z.string().min(1).max(100),
  parentId: z.string().cuid().optional()
});
export class CreateFolderDto extends createZodDto(createFolderSchema) {}

export const renameFolderSchema = z.object({
  name: z.string().min(1).max(100)
});
export class RenameFolderDto extends createZodDto(renameFolderSchema) {}

export const moveFolderSchema = z.object({
  parentId: z.string().cuid().nullable()
});
export class MoveFolderDto extends createZodDto(moveFolderSchema) {}

/* ───────── ASSET DTOs ───────── */

export const mediaListQuerySchema = z.object({
  folderId: z.string().cuid().optional(),
  landingId: z.string().cuid().optional(),
  muted: z.coerce.boolean().optional(),
  type: z.nativeEnum(AssetType).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(40),
  sortBy: z.enum(["createdAt", "name", "size"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc")
});
export class MediaListQueryDto extends createZodDto(mediaListQuerySchema) {}

export const moveAssetsSchema = z.object({
  assetIds: z.array(z.string().cuid()).min(1),
  folderId: z.string().cuid().nullable()
});
export class MoveAssetsDto extends createZodDto(moveAssetsSchema) {}

export const bulkDeleteAssetsSchema = z.object({
  assetIds: z.array(z.string().cuid()).min(1)
});
export class BulkDeleteAssetsDto extends createZodDto(bulkDeleteAssetsSchema) {}

export const updateAssetSchema = z.object({
  originalName: z.string().min(1).max(255).optional(),
  isMuted: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  folderId: z.string().cuid().nullable().optional()
});
export class UpdateAssetDto extends createZodDto(updateAssetSchema) {}

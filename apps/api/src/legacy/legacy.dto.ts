import { LegacySource } from "@prisma/client";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";

import { paginationSchema } from "../common/pagination";

const legacyBaseSchema = z.object({
  name: z.string().min(1),
  path: z.string().min(1),
  source: z.nativeEnum(LegacySource).optional(),
  sourceUrl: z.string().url().optional(),
  branch: z.string().min(1).optional(),
  commitSha: z.string().min(1).optional(),
  syncStatus: z.string().min(1).optional(),
  syncError: z.string().optional(),
  sizeBytes: z
    .string()
    .regex(/^\d+$/)
    .optional()
    .transform((value) => (value === undefined ? undefined : BigInt(value))),
  fileCount: z.number().int().nonnegative().optional(),
  fileTree: z.unknown(),
  tags: z.array(z.string()).optional(),
  geoHint: z.string().optional(),
  categoryHint: z.string().optional()
});

const legacyFileBaseSchema = z.object({
  path: z.string().min(1),
  s3Key: z.string().min(1),
  size: z.number().int().nonnegative(),
  mimeType: z.string().optional(),
  extension: z.string().optional(),
  textContent: z.string().optional(),
  hash: z.string().optional(),
  isBinary: z.boolean().optional()
});

export const legacyListQuerySchema = paginationSchema.extend({
  source: z.nativeEnum(LegacySource).optional(),
  geoHint: z.string().optional(),
  tag: z.string().optional()
});

export const legacyFilesQuerySchema = paginationSchema.extend({
  folder: z.string().optional()
});

export const legacyFileContentSchema = z.object({
  content: z.string()
});

export const legacyUploadQuerySchema = z.object({
  legacyLandingId: z.string().optional(),
  name: z.string().min(1).optional(),
  path: z.string().min(1).optional()
});

export const legacyGitConnectSchema = z.object({
  url: z.string().url().default("https://github.com/GeorgiySergeev/landing-legacy-2"),
  branch: z.string().min(1).default("main")
});

export const legacyAssetQuerySchema = z.object({
  path: z.string().min(1)
});

export const legacyImportAsLandingSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).optional(),
  publicId: z.string().min(1).optional(),
  geoId: z.string().min(1),
  categoryId: z.string().min(1),
  variantId: z.string().min(1),
  templateId: z.string().min(1).optional()
});

export const importLinkSchema = z.object({
  landingId: z.string().min(1)
});

export const legacyScanSchema = z.object({
  root: z.string().min(1).optional(),
  workspace: z.string().min(1).default("default")
});

export class LegacyListQueryDto extends createZodDto(legacyListQuerySchema) {}
export class LegacyFilesQueryDto extends createZodDto(legacyFilesQuerySchema) {}
export class CreateLegacyDto extends createZodDto(legacyBaseSchema) {}
export class UpdateLegacyDto extends createZodDto(legacyBaseSchema.partial()) {}
export class CreateLegacyFileDto extends createZodDto(legacyFileBaseSchema) {}
export class LegacyFileContentDto extends createZodDto(legacyFileContentSchema) {}
export class LegacyUploadQueryDto extends createZodDto(legacyUploadQuerySchema) {}
export class LegacyGitConnectDto extends createZodDto(legacyGitConnectSchema) {}
export class LegacyAssetQueryDto extends createZodDto(legacyAssetQuerySchema) {}
export class LegacyImportAsLandingDto extends createZodDto(legacyImportAsLandingSchema) {}
export class ImportLinkDto extends createZodDto(importLinkSchema) {}
export class LegacyScanDto extends createZodDto(legacyScanSchema) {}

import { LandingStatus } from "@prisma/client";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";

import { paginationSchema } from "../common/pagination";

const landingBaseSchema = z.object({
  publicId: z.string().optional(),
  name: z.string().min(1),
  slug: z.string().min(1),
  geoId: z.string().min(1),
  categoryId: z.string().min(1),
  variantId: z.string().min(1),
  templateId: z.string().optional(),
  status: z.nativeEnum(LandingStatus).optional(),
  previewUrl: z.string().url().optional(),
  publishedUrl: z.string().url().optional(),
  customDomain: z.string().optional(),
  pixels: z.unknown().optional(),
  postbacks: z.unknown().optional(),
  seoMeta: z.unknown().optional(),
  settings: z.unknown().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional()
});

export const landingListQuerySchema = paginationSchema.extend({
  geo: z.string().optional(),
  category: z.string().optional(),
  variant: z.string().optional(),
  status: z.nativeEnum(LandingStatus).optional(),
  includeDeleted: z.coerce.boolean().optional()
});

export const duplicateLandingSchema = z.object({
  geoId: z.string().min(1).optional()
});

export const landingNameAvailabilityQuerySchema = z.object({
  name: z.string().min(1)
});

export const landingPublicIdSuggestionQuerySchema = z.object({
  categoryId: z.string().min(1),
  geoId: z.string().min(1),
  variantId: z.string().min(1)
});

export const bulkLandingStatusSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
  status: z.nativeEnum(LandingStatus)
});

export const bulkLandingDeleteSchema = z.object({
  ids: z.array(z.string().min(1)).min(1)
});

export const lockLandingSchema = z.object({
  ttlMinutes: z.number().int().min(1).max(240).default(15)
});

export class LandingListQueryDto extends createZodDto(landingListQuerySchema) {}
export class CreateLandingDto extends createZodDto(landingBaseSchema) {}
export class UpdateLandingDto extends createZodDto(landingBaseSchema.partial()) {}
export class DuplicateLandingDto extends createZodDto(duplicateLandingSchema) {}
export class LandingNameAvailabilityQueryDto extends createZodDto(
  landingNameAvailabilityQuerySchema
) {}
export class LandingPublicIdSuggestionQueryDto extends createZodDto(
  landingPublicIdSuggestionQuerySchema
) {}
export class BulkLandingStatusDto extends createZodDto(bulkLandingStatusSchema) {}
export class BulkLandingDeleteDto extends createZodDto(bulkLandingDeleteSchema) {}
export class LockLandingDto extends createZodDto(lockLandingSchema) {}

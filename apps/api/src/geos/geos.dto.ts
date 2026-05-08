import { createZodDto } from "nestjs-zod";
import { z } from "zod";

import { boolish } from "../common/schemas";
import { paginationSchema } from "../common/pagination";

const geoBaseSchema = z.object({
  code: z.string().min(2).max(8),
  name: z.string().min(1),
  language: z.string().min(2).max(16),
  currency: z.string().min(3).max(4),
  flagEmoji: z.string().optional(),
  flagUrl: z.string().url().optional(),
  timezone: z.string().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
  metadata: z.unknown().optional()
});

const geoCsvRowSchema = z.object({
  code: z.string().min(2).max(8),
  name: z.string().min(1),
  language: z.string().min(2).max(16),
  currency: z.string().min(3).max(4),
  flagEmoji: z.string().optional(),
  flagUrl: z.string().url().optional(),
  timezone: z.string().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional()
});

export const geoListQuerySchema = paginationSchema.extend({
  isActive: boolish,
  language: z.string().optional()
});

export const reorderGeosSchema = z.object({
  ids: z.array(z.string().min(1)).min(1)
});

export const importGeosSchema = z.object({
  rows: z.array(geoCsvRowSchema).min(1)
});

export class GeoListQueryDto extends createZodDto(geoListQuerySchema) {}
export class CreateGeoDto extends createZodDto(geoBaseSchema) {}
export class UpdateGeoDto extends createZodDto(geoBaseSchema.partial()) {}
export class ReorderGeosDto extends createZodDto(reorderGeosSchema) {}
export class ImportGeosDto extends createZodDto(importGeosSchema) {}

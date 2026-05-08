import { createZodDto } from "nestjs-zod";
import { z } from "zod";

import { paginationSchema } from "../common/pagination";
import { boolish } from "../common/schemas";

const templateBaseSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  thumbnailUrl: z.string().url().optional(),
  previewUrl: z.string().url().optional(),
  baseHtml: z.string().min(1),
  baseCss: z.string().optional(),
  baseJs: z.string().optional(),
  grapesJson: z.unknown().optional(),
  placeholders: z.unknown(),
  blocksJson: z.unknown().optional(),
  categoryId: z.string().optional(),
  geoIds: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  isPublic: z.boolean().optional(),
  isActive: z.boolean().optional(),
  version: z.string().optional()
});

export const templateListQuerySchema = paginationSchema.extend({
  categoryId: z.string().optional(),
  isPublic: boolish,
  isActive: boolish,
  geoId: z.string().optional(),
  tag: z.string().optional()
});

export class TemplateListQueryDto extends createZodDto(templateListQuerySchema) {}
export class CreateTemplateDto extends createZodDto(templateBaseSchema) {}
export class UpdateTemplateDto extends createZodDto(templateBaseSchema.partial()) {}

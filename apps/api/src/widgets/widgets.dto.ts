import { WidgetStatus, WidgetType } from "@prisma/client";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";

import { paginationSchema } from "../common/pagination";

const widgetBaseSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.nativeEnum(WidgetType).optional(),
  status: z.nativeEnum(WidgetStatus).optional(),
  category: z.string().optional(),
  thumbnailUrl: z.string().url().optional(),
  previewUrl: z.string().url().optional(),
  tags: z.array(z.string()).optional()
});

const widgetVersionBaseSchema = z.object({
  version: z.string().min(1),
  bundleUrl: z.string().min(1),
  bundleHash: z.string().min(1),
  schema: z.unknown(),
  changelog: z.string().optional(),
  isLatest: z.boolean().optional()
});

export const widgetListQuerySchema = paginationSchema.extend({
  status: z.nativeEnum(WidgetStatus).optional(),
  type: z.nativeEnum(WidgetType).optional(),
  category: z.string().optional(),
  tag: z.string().optional()
});

export class WidgetListQueryDto extends createZodDto(widgetListQuerySchema) {}
export class CreateWidgetDto extends createZodDto(widgetBaseSchema) {}
export class UpdateWidgetDto extends createZodDto(widgetBaseSchema.partial()) {}
export class CreateWidgetVersionDto extends createZodDto(widgetVersionBaseSchema) {}

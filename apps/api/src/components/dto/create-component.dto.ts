import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const createComponentSchema = z.object({
  name: z.string().min(2).max(80),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  description: z.string().max(200).optional(),
  html: z.string().min(10),
  css: z.string().optional(),
  previewBg: z.string().optional(),
  previewDark: z.boolean().optional(),
  previewHeight: z.number().int().min(100).max(1200).default(400),
  categoryId: z.string().cuid(),
  tags: z.array(z.string().min(1)).max(10).optional(),
  isPinned: z.boolean().optional(),
  isPublic: z.boolean().optional()
});

export class CreateComponentDto extends createZodDto(createComponentSchema) {}

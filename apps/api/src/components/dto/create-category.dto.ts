import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const createComponentCategorySchema = z.object({
  name: z.string().min(2).max(80),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  icon: z.string().optional(),
  description: z.string().max(200).optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional()
});

export const updateComponentCategorySchema = createComponentCategorySchema
  .pick({
    name: true,
    icon: true,
    sortOrder: true
  })
  .partial();

export class CreateCategoryDto extends createZodDto(createComponentCategorySchema) {}
export class UpdateCategoryDto extends createZodDto(updateComponentCategorySchema) {}

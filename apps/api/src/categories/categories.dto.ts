import { createZodDto } from "nestjs-zod";
import { z } from "zod";

import { paginationSchema } from "../common/pagination";
import { boolish } from "../common/schemas";

const categoryBaseSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional()
});

export const categoryListQuerySchema = paginationSchema.extend({
  isActive: boolish
});

export const reorderCategoriesSchema = z.object({
  ids: z.array(z.string().min(1)).min(1)
});

export class CategoryListQueryDto extends createZodDto(categoryListQuerySchema) {}
export class CreateCategoryDto extends createZodDto(categoryBaseSchema) {}
export class UpdateCategoryDto extends createZodDto(categoryBaseSchema.partial()) {}
export class ReorderCategoriesDto extends createZodDto(reorderCategoriesSchema) {}

import { createZodDto } from "nestjs-zod";
import { z } from "zod";

import { paginationSchema } from "../common/pagination";
import { boolish } from "../common/schemas";

const variantBaseSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  icon: z.string().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional()
});

export const variantListQuerySchema = paginationSchema.extend({
  isActive: boolish
});

export const reorderVariantsSchema = z.object({
  ids: z.array(z.string().min(1)).min(1)
});

export class VariantListQueryDto extends createZodDto(variantListQuerySchema) {}
export class CreateVariantDto extends createZodDto(variantBaseSchema) {}
export class UpdateVariantDto extends createZodDto(variantBaseSchema.partial()) {}
export class ReorderVariantsDto extends createZodDto(reorderVariantsSchema) {}

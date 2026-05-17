import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const createProductSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(2).max(120),
  description: z.string().max(2000).optional(),
  categoryId: z.string().cuid().optional(),
  defaultImage: z.string().cuid().optional(),
  claimsKey: z.string().max(200).optional(),
  meta: z.record(z.string(), z.unknown()).optional()
});

export class CreateProductDto extends createZodDto(createProductSchema) {}

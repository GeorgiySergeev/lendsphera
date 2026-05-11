import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const createVariantSchema = z.object({
  name: z.string().min(2).max(80),
  html: z.string().min(10),
  css: z.string().optional(),
  isDefault: z.boolean().optional()
});

export const updateVariantSchema = createVariantSchema.partial();

export class CreateVariantDto extends createZodDto(createVariantSchema) {}
export class UpdateVariantDto extends createZodDto(updateVariantSchema) {}

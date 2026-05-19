import { z } from "zod";
import { createZodDto } from "nestjs-zod";

export const createLandingFromZipSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
  geoId: z.string().min(1, "Geo ID is required"),
  categoryId: z.string().min(1, "Category ID is required"),
  variantId: z.string().min(1, "Variant ID is required"),
  templateId: z.string().optional(),
  publicId: z.string().optional()
});

export class CreateLandingFromZipDto extends createZodDto(createLandingFromZipSchema) {}

import { VersionStatus } from "@prisma/client";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const versionBaseSchema = z.object({
  status: z.nativeEnum(VersionStatus).optional(),
  grapesJson: z.unknown(),
  placeholders: z.unknown(),
  html: z.string().optional(),
  css: z.string().optional(),
  customCss: z.string().optional(),
  customJs: z.string().optional(),
  snapshotS3Key: z.string().optional(),
  snapshotSize: z.number().int().optional(),
  message: z.string().optional(),
  setCurrent: z.boolean().default(true)
});

export class CreateVersionDto extends createZodDto(versionBaseSchema) {}

const draftVersionSchema = z.object({
  assets: z.unknown().optional(),
  components: z.unknown().optional(),
  styles: z.unknown().optional(),
  css: z.string().optional(),
  customCss: z.string().optional(),
  html: z.string().optional(),
  placeholderValues: z.unknown().optional(),
  device: z.enum(["mobile", "tablet", "desktop"]).optional(),
  message: z.string().optional(),
  source: z.literal("grapesjs").optional()
});

export class DraftVersionDto extends createZodDto(draftVersionSchema) {}

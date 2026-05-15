import { BuilderPageStatus } from "@prisma/client";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const deviceSchema = z.enum(["mobile", "tablet", "desktop"]).optional();

export const createBuilderPageSchema = z.object({
  name: z.string().min(1).max(120).optional()
});

export const updateBuilderPageSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  status: z.nativeEnum(BuilderPageStatus).optional()
});

export const saveBuilderDraftSchema = z.object({
  html: z.string().optional(),
  css: z.string().optional(),
  components: z.unknown().optional(),
  styles: z.unknown().optional(),
  assets: z.array(z.unknown()).optional(),
  design: z.unknown().optional(),
  device: deviceSchema,
  message: z.string().max(240).optional()
});

export class CreateBuilderPageDto extends createZodDto(createBuilderPageSchema) {}

export class UpdateBuilderPageDto extends createZodDto(updateBuilderPageSchema) {}

export class SaveBuilderDraftDto extends createZodDto(saveBuilderDraftSchema) {}

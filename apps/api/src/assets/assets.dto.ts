import { AssetType } from "@prisma/client";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";

import { paginationSchema } from "../common/pagination";

const assetBaseSchema = z.object({
  landingId: z.string().optional(),
  type: z.nativeEnum(AssetType),
  mimeType: z.string().min(1),
  originalName: z.string().min(1),
  s3Key: z.string().min(1),
  s3Bucket: z.string().min(1),
  url: z.string().url().optional(),
  size: z.number().int().nonnegative(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  duration: z.number().int().positive().optional(),
  hash: z.string().optional(),
  folder: z.string().optional(),
  tags: z.array(z.string()).optional()
});

export const assetListQuerySchema = paginationSchema.extend({
  landingId: z.string().optional(),
  type: z.nativeEnum(AssetType).optional(),
  folder: z.string().optional(),
  tag: z.string().optional()
});

export class AssetListQueryDto extends createZodDto(assetListQuerySchema) {}
export class CreateAssetDto extends createZodDto(assetBaseSchema) {}
export class UpdateAssetDto extends createZodDto(assetBaseSchema.partial()) {}

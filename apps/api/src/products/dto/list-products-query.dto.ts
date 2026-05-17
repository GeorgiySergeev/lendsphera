import { createZodDto } from "nestjs-zod";
import { z } from "zod";

import { boolish } from "../../common/schemas";

export const listProductsQuerySchema = z.object({
  category: z.string().min(1).optional(),
  q: z.string().trim().min(1).optional(),
  cursor: z.string().min(1).optional(),
  take: z.coerce.number().int().min(1).max(200).default(50),
  includeArchived: boolish
});

export class ListProductsQueryDto extends createZodDto(listProductsQuerySchema) {}

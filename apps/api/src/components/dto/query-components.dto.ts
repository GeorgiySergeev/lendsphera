import { createZodDto } from "nestjs-zod";
import { z } from "zod";

import { boolish } from "../../common/schemas";

const tagsParam = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((value) => {
    if (value === undefined) {
      return undefined;
    }

    return Array.isArray(value) ? value : [value];
  });

export const queryComponentsSchema = z.object({
  categoryId: z.string().optional(),
  tags: tagsParam,
  search: z.string().trim().optional(),
  isPinned: boolish,
  isPublic: boolish,
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24),
  sortBy: z.enum(["updatedAt", "usageCount", "name", "createdAt"]).default("updatedAt"),
  sortDir: z.enum(["asc", "desc"]).default("desc")
});

export class QueryComponentsDto extends createZodDto(queryComponentsSchema) {}

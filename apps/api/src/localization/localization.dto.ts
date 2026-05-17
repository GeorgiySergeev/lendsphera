import { createZodDto } from "nestjs-zod";
import { z } from "zod";

import { paginationSchema } from "../common/pagination";

const i18nMutationSchema = z.object({
  key: z.string().min(1),
  lang: z.string().min(2),
  value: z.string(),
  context: z.string().optional()
});

const renameKeySchema = z.object({
  oldKey: z.string().min(1),
  newKey: z.string().min(1)
});

export const i18nListQuerySchema = paginationSchema.extend({
  namespace: z.string().trim().optional(),
  lang: z.string().trim().optional(),
  missingFor: z.string().trim().optional()
});

export const i18nMissingQuerySchema = z.object({
  lang: z.string().min(2),
  namespace: z.string().trim().optional(),
  search: z.string().trim().optional()
});

export class I18nListQueryDto extends createZodDto(i18nListQuerySchema) {}
export class I18nMissingQueryDto extends createZodDto(i18nMissingQuerySchema) {}
export class UpsertI18nStringDto extends createZodDto(i18nMutationSchema) {}
export class RenameI18nKeyDto extends createZodDto(renameKeySchema) {}

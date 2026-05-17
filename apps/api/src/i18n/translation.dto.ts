import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const translationJobsQuerySchema = z.object({
  take: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.coerce.number().int().min(0).default(0)
});

export class TranslationJobsQueryDto extends createZodDto(translationJobsQuerySchema) {}

export const i18nReviewQueueQuerySchema = z.object({
  take: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.coerce.number().int().min(0).default(0),
  lang: z.string().trim().min(2).max(16).optional()
});

export class I18nReviewQueueQueryDto extends createZodDto(i18nReviewQueueQuerySchema) {}

export const approveI18nTranslationSchema = z.object({
  value: z.string().trim().min(1).optional()
});

export class ApproveI18nTranslationDto extends createZodDto(
  approveI18nTranslationSchema
) {}

export const rejectI18nTranslationSchema = z.object({
  reason: z.string().trim().min(3).max(500)
});

export class RejectI18nTranslationDto extends createZodDto(rejectI18nTranslationSchema) {}

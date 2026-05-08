import { AuditAction } from "@prisma/client";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const auditLogListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  action: z.nativeEnum(AuditAction).optional(),
  entity: z.string().optional(),
  entityId: z.string().optional(),
  userId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional()
});

export class AuditLogListQueryDto extends createZodDto(auditLogListQuerySchema) {}

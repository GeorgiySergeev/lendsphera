import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const complianceIssueListQuerySchema = z.object({
  take: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.coerce.number().int().min(0).default(0),
  status: z.enum(["OPEN", "ACKNOWLEDGED", "AUTO_FIXED"]).optional()
});

export class ComplianceIssueListQueryDto extends createZodDto(
  complianceIssueListQuerySchema
) {}

export const acknowledgeComplianceIssueSchema = z.object({
  reason: z.string().trim().min(3).max(500)
});

export class AcknowledgeComplianceIssueDto extends createZodDto(
  acknowledgeComplianceIssueSchema
) {}

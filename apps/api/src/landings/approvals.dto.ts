import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const approvalDecisionSchema = z.object({
  note: z.string().trim().max(2000).optional()
});

export class ApprovalDecisionDto extends createZodDto(approvalDecisionSchema) {}

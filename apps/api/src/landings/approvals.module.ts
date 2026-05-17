import { Module } from "@nestjs/common";

import { AuditModule } from "../audit/audit.module";
import { PolicyModule } from "../policy/policy.module";
import { PrismaModule } from "../prisma/prisma.module";
import { ApprovalsController } from "./approvals.controller";
import { ApprovalsService } from "./approvals.service";

@Module({
  imports: [PrismaModule, AuditModule, PolicyModule],
  controllers: [ApprovalsController],
  providers: [ApprovalsService],
  exports: [ApprovalsService]
})
export class ApprovalsModule {}

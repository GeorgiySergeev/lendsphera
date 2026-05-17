import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";

import { AuditModule } from "../audit/audit.module";
import { PrismaModule } from "../prisma/prisma.module";
import { ComplianceController } from "./compliance.controller";
import { ComplianceService } from "./compliance.service";
import {
  COMPLIANCE_SWEEPER_QUEUE,
  ComplianceSweeperProcessor,
  ComplianceSweeperScheduler
} from "./sweeper.processor";

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    BullModule.registerQueue({
      name: COMPLIANCE_SWEEPER_QUEUE
    })
  ],
  controllers: [ComplianceController],
  providers: [ComplianceService, ComplianceSweeperProcessor, ComplianceSweeperScheduler],
  exports: [ComplianceService]
})
export class ComplianceModule {}

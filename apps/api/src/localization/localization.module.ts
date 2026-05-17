import { Module } from "@nestjs/common";

import { AuditModule } from "../audit/audit.module";
import { TranslationQueueModule } from "../i18n/translation-queue.module";
import { PrismaModule } from "../prisma/prisma.module";
import { LocalizationController } from "./localization.controller";
import { LocalizationService } from "./localization.service";

@Module({
  imports: [PrismaModule, AuditModule, TranslationQueueModule],
  controllers: [LocalizationController],
  providers: [LocalizationService]
})
export class LocalizationModule {}

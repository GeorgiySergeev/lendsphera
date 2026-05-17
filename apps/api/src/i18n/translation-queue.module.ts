import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";

import { AuditModule } from "../audit/audit.module";
import { PrismaModule } from "../prisma/prisma.module";
import { TranslationController } from "./translation.controller";
import { I18nStringService } from "./i18n-string.service";
import { TRANSLATION_QUEUE, TranslationQueueService } from "./translation-queue.service";
import { TranslationProcessor } from "./translation.processor";

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    BullModule.registerQueue({
      name: TRANSLATION_QUEUE
    })
  ],
  controllers: [TranslationController],
  providers: [TranslationQueueService, TranslationProcessor, I18nStringService],
  exports: [TranslationQueueService, I18nStringService]
})
export class TranslationQueueModule {}

import { Module } from "@nestjs/common";

import { PrismaModule } from "../prisma/prisma.module";
import { StorageModule } from "../storage/storage.module";
import { LegacyImporterController } from "./orchestrator.controller";
import { LegacyImporterOrchestratorService } from "./orchestrator.service";

@Module({
  imports: [PrismaModule, StorageModule],
  controllers: [LegacyImporterController],
  providers: [LegacyImporterOrchestratorService]
})
export class LegacyImporterModule {}

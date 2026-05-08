import { Module } from "@nestjs/common";

import { PrismaModule } from "../prisma/prisma.module";
import { StorageModule } from "../storage/storage.module";
import { LegacyController } from "./legacy.controller";
import { LegacyService } from "./legacy.service";

@Module({
  imports: [PrismaModule, StorageModule],
  controllers: [LegacyController],
  providers: [LegacyService]
})
export class LegacyModule {}

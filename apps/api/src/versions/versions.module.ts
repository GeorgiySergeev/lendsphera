import { Module } from "@nestjs/common";

import { PrismaModule } from "../prisma/prisma.module";
import { VersionsController } from "./versions.controller";
import { VersionsService } from "./versions.service";

@Module({
  imports: [PrismaModule],
  controllers: [VersionsController],
  providers: [VersionsService],
  exports: [VersionsService]
})
export class VersionsModule {}

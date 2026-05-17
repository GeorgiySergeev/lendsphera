import { Module } from "@nestjs/common";

import { AuditModule } from "../audit/audit.module";
import { PrismaModule } from "../prisma/prisma.module";
import { RedisModule } from "../redis/redis.module";
import { LandingContextResolver } from "./landing-context.resolver";
import { LandingBulkController } from "./bulk.controller";
import { LandingsController } from "./landings.controller";
import { LandingsService } from "./landings.service";
import { LandingPreviewController } from "./preview.controller";
import { RuntimeLandingsController } from "./runtime-landings.controller";
import { RuntimeLandingsService } from "./runtime-landings.service";
import { RuntimeVarsController } from "./runtime-vars.controller";
import { RuntimeVarsGuard } from "./runtime-vars.guard";
import { RuntimeVarsService } from "./runtime-vars.service";

@Module({
  imports: [PrismaModule, RedisModule, AuditModule],
  controllers: [
    LandingsController,
    LandingBulkController,
    LandingPreviewController,
    RuntimeVarsController,
    RuntimeLandingsController
  ],
  providers: [
    LandingsService,
    LandingContextResolver,
    RuntimeVarsService,
    RuntimeVarsGuard,
    RuntimeLandingsService
  ],
  exports: [LandingsService, LandingContextResolver]
})
export class LandingsModule {}

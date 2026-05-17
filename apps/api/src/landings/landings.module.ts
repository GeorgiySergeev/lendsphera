import { Module } from "@nestjs/common";

import { AuditModule } from "../audit/audit.module";
import { PrismaModule } from "../prisma/prisma.module";
import { RedisModule } from "../redis/redis.module";
import { LandingContextResolver } from "./landing-context.resolver";
import { LandingsController } from "./landings.controller";
import { LandingsService } from "./landings.service";

@Module({
  imports: [PrismaModule, RedisModule, AuditModule],
  controllers: [LandingsController],
  providers: [LandingsService, LandingContextResolver],
  exports: [LandingsService]
})
export class LandingsModule {}

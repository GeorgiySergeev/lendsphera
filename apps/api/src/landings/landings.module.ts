import { Module } from "@nestjs/common";

import { AuditModule } from "../audit/audit.module";
import { PrismaModule } from "../prisma/prisma.module";
import { RedisModule } from "../redis/redis.module";
import { LandingsController } from "./landings.controller";
import { LandingsService } from "./landings.service";

@Module({
  imports: [PrismaModule, RedisModule, AuditModule],
  controllers: [LandingsController],
  providers: [LandingsService],
  exports: [LandingsService]
})
export class LandingsModule {}

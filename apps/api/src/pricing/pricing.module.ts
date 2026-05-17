import { Module } from "@nestjs/common";

import { AuditModule } from "../audit/audit.module";
import { EventBusModule } from "../events/event-bus.module";
import { PrismaModule } from "../prisma/prisma.module";
import { PricingController } from "./pricing.controller";
import { PricingService } from "./pricing.service";

@Module({
  imports: [PrismaModule, AuditModule, EventBusModule],
  controllers: [PricingController],
  providers: [PricingService]
})
export class PricingModule {}

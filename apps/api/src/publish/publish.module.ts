import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";

import { EventBusModule } from "../events/event-bus.module";
import { LandingsModule } from "../landings/landings.module";
import { PrismaModule } from "../prisma/prisma.module";
import { PublishController } from "./publish.controller";
import { PublishProcessor } from "./publish.processor";
import { PublishService } from "./publish.service";

@Module({
  imports: [
    PrismaModule,
    LandingsModule,
    EventBusModule,
    BullModule.registerQueue({
      name: "publishLanding"
    })
  ],
  controllers: [PublishController],
  providers: [PublishService, PublishProcessor],
  exports: [PublishService]
})
export class PublishModule {}

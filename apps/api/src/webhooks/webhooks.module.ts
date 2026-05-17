import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";

import { EventBusModule } from "../events/event-bus.module";
import { LandingEventsListener } from "../landings/landing-events.listener";
import { PrismaModule } from "../prisma/prisma.module";
import { WebhooksController } from "./webhooks.controller";
import { WebhooksProcessor } from "./webhooks.processor";
import { WebhooksService } from "./webhooks.service";

@Module({
  imports: [
    PrismaModule,
    EventBusModule,
    BullModule.registerQueue({
      name: "webhookDeliveries"
    })
  ],
  controllers: [WebhooksController],
  providers: [WebhooksService, WebhooksProcessor, LandingEventsListener],
  exports: [WebhooksService]
})
export class WebhooksModule {}

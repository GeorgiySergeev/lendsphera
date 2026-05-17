import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, OnModuleInit } from "@nestjs/common";
import { LandingStatus } from "@prisma/client";
import type { Queue } from "bullmq";

import { PrismaService } from "../prisma/prisma.service";
import {
  EventBusService,
  type LandingInvalidatedEvent,
  type PriceChangedEvent
} from "../events/event-bus.service";

@Injectable()
export class LandingEventsListener implements OnModuleInit {
  constructor(
    private readonly bus: EventBusService,
    private readonly prisma: PrismaService,
    @InjectQueue("webhookDeliveries") private readonly queue: Queue
  ) {}

  onModuleInit(): void {
    this.bus.on("price.changed", async (event) => {
      await this.onPriceChanged(event);
    });
  }

  private async onPriceChanged(event: PriceChangedEvent): Promise<void> {
    const where = {
      productId: event.productId,
      status: LandingStatus.PUBLISHED,
      deletedAt: null,
      ...(event.geoId ? { geoId: event.geoId } : {})
    };

    const affected = await this.prisma.landing.findMany({
      where,
      select: { id: true }
    });

    for (const landing of affected) {
      await this.prisma.landing.update({
        where: { id: landing.id },
        data: { updatedAt: new Date() }
      });

      const payload: LandingInvalidatedEvent = {
        event: "landing.invalidated",
        at: new Date().toISOString(),
        landingId: landing.id,
        source: "price.changed"
      };
      await this.bus.publish(payload);
      await this.queue.add(
        "deliver",
        {
          event: payload.event,
          at: payload.at,
          landingId: payload.landingId,
          source: payload.source
        },
        {
          attempts: 1,
          removeOnComplete: 1000,
          removeOnFail: 1000
        }
      );
    }
  }
}

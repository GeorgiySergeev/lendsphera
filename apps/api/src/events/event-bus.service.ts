import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import Redis from "ioredis";

import { env } from "../config/env";

export type PriceChangedEvent = {
  event: "price.changed";
  at: string;
  productId: string;
  geoId: string | null;
  priceId: string;
  validFrom: string;
  userId: string;
};

export type LandingInvalidatedEvent = {
  event: "landing.invalidated";
  at: string;
  landingId: string;
  source: "price.changed";
};

export type LandingPublishedEvent = {
  event: "landing.published";
  at: string;
  landingId: string;
  versionId: string;
  source: "publish.job";
};

type EventEnvelope = PriceChangedEvent | LandingInvalidatedEvent | LandingPublishedEvent;

type EventHandler<T extends EventEnvelope> = (payload: T) => Promise<void> | void;

@Injectable()
export class EventBusService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventBusService.name);
  private readonly pub = new Redis(env.REDIS_URL);
  // Subscriber connections cannot run INFO (ready check) after SUBSCRIBE.
  private readonly sub = new Redis(env.REDIS_URL, {
    enableReadyCheck: false,
    maxRetriesPerRequest: null
  });
  private readonly channel = "lendsphera.events";
  private handlers = new Map<string, Array<EventHandler<EventEnvelope>>>();

  constructor() {
    this.sub.on("error", (error) => {
      this.logger.error("Redis subscriber connection error", error);
    });
  }

  async onModuleInit() {
    await this.sub.subscribe(this.channel);
    this.sub.on("message", async (channel, message) => {
      if (channel !== this.channel) return;
      try {
        const envelope = JSON.parse(message) as EventEnvelope;
        const bucket = this.handlers.get(envelope.event) ?? [];
        for (const handler of bucket) {
          await handler(envelope);
        }
      } catch (error) {
        this.logger.error("Failed to process event-bus message", error as Error);
      }
    });
  }

  on<T extends EventEnvelope["event"]>(
    event: T,
    handler: EventHandler<Extract<EventEnvelope, { event: T }>>
  ): void {
    const current = this.handlers.get(event) ?? [];
    current.push(handler as EventHandler<EventEnvelope>);
    this.handlers.set(event, current);
  }

  async publish(payload: EventEnvelope): Promise<void> {
    await this.pub.publish(this.channel, JSON.stringify(payload));
  }

  async onModuleDestroy() {
    await this.sub.unsubscribe(this.channel);
    await Promise.all([this.pub.quit(), this.sub.quit()]);
  }
}

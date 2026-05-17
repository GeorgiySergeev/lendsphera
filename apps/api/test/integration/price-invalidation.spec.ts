import { LandingStatus, Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { LandingEventsListener } from "../../src/landings/landing-events.listener";
import { PricingService } from "../../src/pricing/pricing.service";

describe("price invalidation flow", () => {
  it("emits price.changed, landing.invalidated per landing, and queues webhook deliveries", async () => {
    const published = [{ id: "landing_1" }, { id: "landing_2" }];

    const tx = {
      price: {
        findUnique: vi.fn().mockResolvedValue(null),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        create: vi.fn().mockResolvedValue({ id: "price_1", geoId: "geo_1" })
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({})
      }
    };

    const prisma = {
      geo: { findUniqueOrThrow: vi.fn().mockResolvedValue({ id: "geo_1" }) },
      $transaction: vi.fn(async (fn: (trx: typeof tx) => Promise<unknown>) => fn(tx)),
      landing: {
        findMany: vi.fn().mockResolvedValue(published),
        update: vi.fn().mockResolvedValue({})
      }
    };

    const queue = {
      add: vi.fn().mockResolvedValue({})
    };

    const busHandlers = new Map<string, Array<(payload: any) => Promise<void>>>();
    const bus = {
      on: vi.fn((event: string, handler: (payload: any) => Promise<void>) => {
        const bucket = busHandlers.get(event) ?? [];
        bucket.push(handler);
        busHandlers.set(event, bucket);
      }),
      publish: vi.fn(async (payload: unknown) => {
        const handlers = busHandlers.get((payload as { event: string }).event) ?? [];
        for (const handler of handlers) {
          await handler(payload);
        }
      })
    };

    const pricing = new PricingService(prisma as never, bus as never);
    const listener = new LandingEventsListener(
      bus as never,
      prisma as never,
      queue as never
    );
    listener.onModuleInit();

    await pricing.createPeriod(
      {
        productId: "product_1",
        geoCode: "DE",
        validFrom: "2026-05-17T12:00:00.000Z",
        price: new Prisma.Decimal("39.50"),
        oldPrice: new Prisma.Decimal("79.00"),
        currency: "EUR"
      },
      "user_1"
    );

    expect(bus.publish).toHaveBeenCalledWith(
      expect.objectContaining({ event: "price.changed", productId: "product_1" })
    );
    expect(prisma.landing.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: LandingStatus.PUBLISHED,
          productId: "product_1"
        })
      })
    );
    expect(bus.publish).toHaveBeenCalledWith(
      expect.objectContaining({ event: "landing.invalidated", landingId: "landing_1" })
    );
    expect(bus.publish).toHaveBeenCalledWith(
      expect.objectContaining({ event: "landing.invalidated", landingId: "landing_2" })
    );
    expect(queue.add).toHaveBeenCalledTimes(2);
  });
});

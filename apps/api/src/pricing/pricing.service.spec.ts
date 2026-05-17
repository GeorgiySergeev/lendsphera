import { ConflictException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { PricingService } from "./pricing.service";

function createService(overrides?: Partial<Record<string, unknown>>) {
  const prisma = {
    geo: {
      findUniqueOrThrow: vi.fn().mockResolvedValue({ id: "geo_1" }),
      findMany: vi.fn().mockResolvedValue([{ id: "geo_1", code: "DE" }])
    },
    price: {
      findFirst: vi.fn(),
      findMany: vi.fn()
    },
    $transaction: vi.fn(),
    ...overrides
  };

  return {
    service: new PricingService(prisma as never),
    prisma
  };
}

describe("PricingService", () => {
  it("resolveActive uses now when at is missing", async () => {
    const { service, prisma } = createService();
    (prisma.price.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await service.resolveActive("product_1", "DE");

    expect(prisma.price.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          productId: "product_1",
          geoId: "geo_1",
          OR: [{ validTo: null }, { validTo: { gt: expect.any(Date) } }]
        })
      })
    );
  });

  it("createPeriod is idempotent when payload matches existing period", async () => {
    const tx = {
      price: {
        findUnique: vi.fn().mockResolvedValue({
          id: "price_1",
          productId: "product_1",
          geoId: "geo_1",
          validFrom: new Date("2026-01-01T00:00:00.000Z"),
          price: new Prisma.Decimal("100"),
          oldPrice: new Prisma.Decimal("120"),
          currency: "EUR"
        }),
        updateMany: vi.fn(),
        create: vi.fn()
      },
      auditLog: {
        create: vi.fn()
      }
    };
    const { service, prisma } = createService({
      $transaction: vi.fn(async (cb: (inner: typeof tx) => unknown) => cb(tx as never))
    });

    const result = await service.createPeriod(
      {
        productId: "product_1",
        geoCode: "DE",
        validFrom: "2026-01-01T00:00:00.000Z",
        price: "100",
        oldPrice: "120",
        currency: "EUR"
      },
      "user_1"
    );

    expect(result).toMatchObject({ id: "price_1" });
    expect(tx.price.updateMany).not.toHaveBeenCalled();
    expect(tx.price.create).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("createPeriod closes previous open period and creates a new one", async () => {
    const tx = {
      price: {
        findUnique: vi.fn().mockResolvedValue(null),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        create: vi.fn().mockResolvedValue({ id: "price_2", geo: null, product: null })
      },
      auditLog: {
        create: vi.fn().mockResolvedValue(undefined)
      }
    };
    const { service } = createService({
      $transaction: vi.fn(async (cb: (inner: typeof tx) => unknown) => cb(tx as never))
    });

    await service.createPeriod(
      {
        productId: "product_1",
        geoCode: "DE",
        validFrom: "2026-02-01T00:00:00.000Z",
        price: "90",
        oldPrice: "100",
        currency: "EUR"
      },
      "user_1"
    );

    expect(tx.price.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          productId: "product_1",
          geoId: "geo_1",
          validTo: null
        })
      })
    );
    expect(tx.price.create).toHaveBeenCalled();
    expect(tx.auditLog.create).toHaveBeenCalled();
  });

  it("createPeriod throws on same validFrom but different payload", async () => {
    const tx = {
      price: {
        findUnique: vi.fn().mockResolvedValue({
          id: "price_1",
          price: new Prisma.Decimal("100"),
          oldPrice: null,
          currency: "EUR"
        }),
        updateMany: vi.fn(),
        create: vi.fn()
      },
      auditLog: {
        create: vi.fn()
      }
    };
    const { service } = createService({
      $transaction: vi.fn(async (cb: (inner: typeof tx) => unknown) => cb(tx as never))
    });

    await expect(
      service.createPeriod(
        {
          productId: "product_1",
          geoCode: "DE",
          validFrom: "2026-01-01T00:00:00.000Z",
          price: "101",
          currency: "EUR"
        },
        "user_1"
      )
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

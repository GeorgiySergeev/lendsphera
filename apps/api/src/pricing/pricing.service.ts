import { ConflictException, Injectable } from "@nestjs/common";
import { AuditAction, Prisma } from "@prisma/client";

import { EventBusService } from "../events/event-bus.service";
import { PrismaService } from "../prisma/prisma.service";

type DecimalLike = string | number | Prisma.Decimal;

type CreatePeriodInput = {
  productId: string;
  geoCode: string | null;
  validFrom: string;
  price: DecimalLike;
  oldPrice?: DecimalLike;
  currency: string;
  notes?: string;
};

type BulkApplyInput = {
  productIds: string[];
  geoCodes: string[];
  operation: "set" | "percent";
  value: DecimalLike;
  validFrom: string;
  currency?: string;
  notes?: string;
};

@Injectable()
export class PricingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService
  ) {}

  async resolveActive(productId: string, geoCode: string | null, at?: string) {
    const atDate = at ? new Date(at) : new Date();
    const geoId = await this.resolveGeoId(geoCode);

    return this.prisma.price.findFirst({
      where: {
        productId,
        geoId,
        validFrom: { lte: atDate },
        OR: [{ validTo: null }, { validTo: { gt: atDate } }]
      },
      orderBy: [{ validFrom: "desc" }, { createdAt: "desc" }],
      include: { geo: true, product: true }
    });
  }

  async listHistory(
    productId: string,
    geoCode: string | null,
    cursor?: string,
    take = 50
  ) {
    const geoId = await this.resolveGeoId(geoCode);
    const items = await this.prisma.price.findMany({
      where: { productId, geoId },
      orderBy: [{ validFrom: "desc" }, { createdAt: "desc" }, { id: "desc" }],
      include: { geo: true },
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      take
    });

    return {
      items,
      nextCursor: items.length === take ? (items.at(-1)?.id ?? null) : null
    };
  }

  async createPeriod(input: CreatePeriodInput, userId: string) {
    const validFrom = new Date(input.validFrom);
    const price = new Prisma.Decimal(input.price);
    const oldPrice =
      input.oldPrice === undefined ? null : new Prisma.Decimal(input.oldPrice);
    const currency = input.currency.toUpperCase();
    const geoId = await this.resolveGeoId(input.geoCode);

    return this.prisma.$transaction(async (tx) => {
      const existing =
        geoId === null
          ? await tx.price.findFirst({
              where: { productId: input.productId, geoId: null, validFrom }
            })
          : await tx.price.findUnique({
              where: {
                productId_geoId_validFrom: {
                  productId: input.productId,
                  geoId,
                  validFrom
                }
              }
            });

      if (existing) {
        const samePayload =
          existing.price.equals(price) &&
          ((existing.oldPrice === null && oldPrice === null) ||
            (existing.oldPrice !== null &&
              oldPrice !== null &&
              existing.oldPrice.equals(oldPrice))) &&
          existing.currency === currency;

        if (samePayload) {
          return existing;
        }

        throw new ConflictException(
          "Price period already exists for this validFrom with different payload."
        );
      }

      await tx.price.updateMany({
        where: {
          productId: input.productId,
          geoId,
          validTo: null,
          validFrom: { lt: validFrom }
        },
        data: {
          validTo: validFrom
        }
      });

      const created = await tx.price.create({
        data: {
          productId: input.productId,
          geoId,
          validFrom,
          price,
          oldPrice,
          currency,
          createdBy: userId,
          notes: input.notes
        },
        include: { geo: true, product: true }
      });

      await tx.auditLog.create({
        data: {
          action: AuditAction.CREATE,
          entity: "price.create",
          entityId: created.id,
          userId,
          diff: {
            productId: input.productId,
            geoId,
            validFrom: validFrom.toISOString()
          } satisfies Prisma.JsonObject
        }
      });

      await this.eventBus.publish({
        event: "price.changed",
        at: new Date().toISOString(),
        productId: input.productId,
        geoId,
        priceId: created.id,
        validFrom: validFrom.toISOString(),
        userId
      });

      return created;
    });
  }

  async bulkApply(input: BulkApplyInput, userId: string) {
    const geoMap = await this.loadGeosByCode(input.geoCodes);
    const validFrom = new Date(input.validFrom);
    const scalar = new Prisma.Decimal(input.value);
    const createdIds = await this.prisma.$transaction(async (tx) => {
      const result: string[] = [];

      for (const productId of input.productIds) {
        for (const geoCode of input.geoCodes) {
          const geoId = geoMap.get(geoCode.toUpperCase()) ?? null;
          const resolved = await this.resolveAtTx(tx, productId, geoId, validFrom);
          const currency = input.currency ?? resolved?.currency ?? "EUR";

          const computedPrice =
            input.operation === "set"
              ? scalar
              : (resolved?.price ?? new Prisma.Decimal(0)).mul(
                  new Prisma.Decimal(1).add(scalar.div(100))
                );

          const created = await this.createPeriodTx(
            tx,
            {
              productId,
              geoId,
              validFrom,
              price: computedPrice,
              oldPrice: resolved?.price ?? null,
              currency,
              notes: input.notes
            },
            userId
          );
          result.push(created.id);
        }
      }

      await tx.auditLog.create({
        data: {
          action: AuditAction.UPDATE,
          entity: "price.bulk",
          entityId: validFrom.toISOString(),
          userId,
          diff: {
            operation: input.operation,
            value: scalar.toString(),
            productCount: input.productIds.length,
            geoCount: input.geoCodes.length,
            createdCount: result.length
          } satisfies Prisma.JsonObject
        }
      });

      return result;
    });

    return { createdCount: createdIds.length, ids: createdIds };
  }

  private async createPeriodTx(
    tx: Prisma.TransactionClient,
    input: {
      productId: string;
      geoId: string | null;
      validFrom: Date;
      price: Prisma.Decimal;
      oldPrice: Prisma.Decimal | null;
      currency: string;
      notes?: string;
    },
    userId: string
  ) {
    const existing =
      input.geoId === null
        ? await tx.price.findFirst({
            where: { productId: input.productId, geoId: null, validFrom: input.validFrom }
          })
        : await tx.price.findUnique({
            where: {
              productId_geoId_validFrom: {
                productId: input.productId,
                geoId: input.geoId,
                validFrom: input.validFrom
              }
            }
          });

    if (existing) {
      const samePayload =
        existing.price.equals(input.price) &&
        ((existing.oldPrice === null && input.oldPrice === null) ||
          (existing.oldPrice !== null &&
            input.oldPrice !== null &&
            existing.oldPrice.equals(input.oldPrice))) &&
        existing.currency === input.currency;

      if (samePayload) {
        return existing;
      }

      throw new ConflictException(
        "Price period already exists for this validFrom with different payload."
      );
    }

    await tx.price.updateMany({
      where: {
        productId: input.productId,
        geoId: input.geoId,
        validTo: null,
        validFrom: { lt: input.validFrom }
      },
      data: { validTo: input.validFrom }
    });

    const created = await tx.price.create({
      data: {
        productId: input.productId,
        geoId: input.geoId,
        validFrom: input.validFrom,
        price: input.price,
        oldPrice: input.oldPrice,
        currency: input.currency,
        createdBy: userId,
        notes: input.notes
      }
    });

    await tx.auditLog.create({
      data: {
        action: AuditAction.CREATE,
        entity: "price.create",
        entityId: created.id,
        userId,
        diff: {
          productId: input.productId,
          geoId: input.geoId,
          validFrom: input.validFrom.toISOString()
        } satisfies Prisma.JsonObject
      }
    });

    await this.eventBus.publish({
      event: "price.changed",
      at: new Date().toISOString(),
      productId: input.productId,
      geoId: input.geoId,
      priceId: created.id,
      validFrom: input.validFrom.toISOString(),
      userId
    });

    return created;
  }

  private async resolveAtTx(
    tx: Prisma.TransactionClient,
    productId: string,
    geoId: string | null,
    at: Date
  ) {
    return tx.price.findFirst({
      where: {
        productId,
        geoId,
        validFrom: { lte: at },
        OR: [{ validTo: null }, { validTo: { gt: at } }]
      },
      orderBy: [{ validFrom: "desc" }, { createdAt: "desc" }]
    });
  }

  private async resolveGeoId(geoCode: string | null) {
    if (!geoCode) {
      return null;
    }

    const geo = await this.prisma.geo.findUniqueOrThrow({
      where: { code: geoCode.toUpperCase() },
      select: { id: true }
    });

    return geo.id;
  }

  private async loadGeosByCode(codes: string[]) {
    const normalized = Array.from(new Set(codes.map((code) => code.toUpperCase())));
    const geos = await this.prisma.geo.findMany({
      where: { code: { in: normalized } },
      select: { id: true, code: true }
    });

    if (geos.length !== normalized.length) {
      throw new ConflictException("One or more geo codes were not found.");
    }

    return new Map(geos.map((geo) => [geo.code.toUpperCase(), geo.id]));
  }
}

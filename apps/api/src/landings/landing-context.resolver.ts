import { Injectable } from "@nestjs/common";
import type { LandingContext } from "@workspace/types";

import { PrismaService } from "../prisma/prisma.service";
import type {
  LandingContextLayerConfig,
  LandingI18nRow,
  PriceView,
  StringMap
} from "./landing-context.types";

@Injectable()
export class LandingContextResolver {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(landingId: string, at = new Date()): Promise<LandingContext> {
    return this.prisma.$transaction(async (tx) => {
      const landing = await tx.landing.findUniqueOrThrow({
        where: { id: landingId },
        include: {
          currentVersion: true,
          geo: true,
          product: true
        }
      });

      const settings = this.asUnknownRecord(landing.settings);
      const layerConfig = this.asLayerConfig(settings);
      const i18nKeys = this.pickI18nKeys(layerConfig, landing.product?.claimsKey ?? null);

      const [prices, i18nRows] = await Promise.all([
        landing.productId
          ? tx.price.findMany({
              where: {
                productId: landing.productId,
                validFrom: { lte: at },
                AND: [
                  { OR: [{ validTo: null }, { validTo: { gt: at } }] },
                  { OR: [{ geoId: landing.geoId }, { geoId: null }] }
                ]
              },
              orderBy: [{ validFrom: "desc" }],
              select: {
                geoId: true,
                currency: true,
                oldPrice: true,
                price: true,
                validFrom: true
              }
            })
          : Promise.resolve([]),
        tx.i18nString.findMany({
          where: {
            ...(i18nKeys.length ? { key: { in: i18nKeys } } : {}),
            lang: { in: [landing.geo.language, "en"] }
          },
          select: {
            key: true,
            lang: true,
            value: true
          }
        })
      ]);

      const activePrice = this.pickActivePrice(prices, landing.geoId);
      const resolvedCurrency = activePrice.currency ?? landing.geo.currency ?? null;
      const mergedPlaceholders = this.mergeLayers({
        global: {
          ...this.asStringRecord(landing.currentVersion?.placeholders),
          ...this.asStringRecord(layerConfig.global)
        },
        geo: this.pickGeoLayer(layerConfig.geo, landing.geoId),
        product: this.pickProductLayer(layerConfig.product, landing.productId),
        price: this.priceToLayer({ ...activePrice, currency: resolvedCurrency }),
        overrides: this.asStringRecord(layerConfig.landing?.overrides)
      });

      return {
        landingId: landing.id,
        slug: landing.slug,
        geoId: landing.geoId,
        lang: landing.geo.language,
        dir: "ltr",
        productId: landing.productId,
        productName: landing.product?.name ?? null,
        productImage: landing.product?.defaultImage ?? null,
        price: activePrice.price,
        oldPrice: activePrice.oldPrice,
        currency: resolvedCurrency,
        discount: activePrice.discount,
        templateId: landing.templateId,
        placeholders: mergedPlaceholders,
        i18n: this.mergeI18n(i18nRows, landing.geo.language),
        pixels: this.asStringRecordOrNull(landing.pixels),
        postbacks: this.asStringRecordOrNull(landing.postbacks),
        seoMeta: this.asSeoMeta(landing.seoMeta),
        settings,
        versionId: landing.currentVersionId,
        resolvedAt: at.toISOString()
      };
    });
  }

  private mergeLayers(layers: {
    global: StringMap;
    geo: StringMap;
    product: StringMap;
    price: StringMap;
    overrides: StringMap;
  }): StringMap {
    return {
      ...layers.global,
      ...layers.geo,
      ...layers.product,
      ...layers.price,
      ...layers.overrides
    };
  }

  private pickGeoLayer(input: unknown, geoId: string): StringMap {
    const direct = this.asStringRecord(input);
    if (Object.keys(direct).length) return direct;

    if (!input || typeof input !== "object" || Array.isArray(input)) return {};
    const asMap = input as Record<string, unknown>;
    return this.asStringRecord(asMap[geoId]);
  }

  private pickProductLayer(input: unknown, productId: string | null): StringMap {
    const direct = this.asStringRecord(input);
    if (Object.keys(direct).length || !productId) return direct;

    if (!input || typeof input !== "object" || Array.isArray(input)) return {};
    const asMap = input as Record<string, unknown>;
    return this.asStringRecord(asMap[productId]);
  }

  private pickActivePrice(
    prices: Array<{
      geoId: string | null;
      price: { toString(): string; toNumber(): number };
      oldPrice: { toString(): string; toNumber(): number } | null;
      currency: string;
      validFrom: Date;
    }>,
    geoId: string
  ): PriceView {
    const scoped =
      prices.find((row) => row.geoId === geoId) ??
      prices.find((row) => row.geoId === null);
    if (!scoped) {
      return {
        price: null,
        oldPrice: null,
        discount: null,
        currency: null
      };
    }

    const price = scoped.price.toString();
    const oldPrice = scoped.oldPrice?.toString() ?? null;
    return {
      price,
      oldPrice,
      currency: scoped.currency || null,
      discount:
        scoped.oldPrice && scoped.price
          ? this.computeDiscount(scoped.price.toNumber(), scoped.oldPrice.toNumber())
          : null
    };
  }

  private priceToLayer(price: PriceView): StringMap {
    const layer: StringMap = {};
    if (price.price !== null) layer.price = price.price;
    if (price.oldPrice !== null) layer.oldPrice = price.oldPrice;
    if (price.currency !== null) layer.currency = price.currency;
    if (price.discount !== null) layer.discount = price.discount;
    return layer;
  }

  private mergeI18n(rows: LandingI18nRow[], lang: string): Record<string, string> {
    const english: Record<string, string> = {};
    const localized: Record<string, string> = {};

    for (const row of rows) {
      if (row.lang === "en") english[row.key] = row.value;
      if (row.lang === lang) localized[row.key] = row.value;
    }

    return {
      ...english,
      ...localized
    };
  }

  private pickI18nKeys(
    layerConfig: LandingContextLayerConfig,
    claimsKey: string | null
  ): string[] {
    const explicit = Array.isArray(layerConfig.i18n?.keys)
      ? layerConfig.i18n.keys.filter(
          (key): key is string => typeof key === "string" && key.trim().length > 0
        )
      : [];

    if (!claimsKey) return explicit;
    return [...new Set([...explicit, claimsKey])];
  }

  private asLayerConfig(value: Record<string, unknown>): LandingContextLayerConfig {
    return value as LandingContextLayerConfig;
  }

  private asStringRecord(value: unknown): Record<string, string> {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const result: Record<string, string> = {};
    for (const [key, entry] of Object.entries(value)) {
      if (typeof entry === "string") {
        result[key] = entry;
      }
    }
    return result;
  }

  private asStringRecordOrNull(value: unknown): Record<string, string> | null {
    const parsed = this.asStringRecord(value);
    return Object.keys(parsed).length ? parsed : null;
  }

  private asUnknownRecord(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return value as Record<string, unknown>;
  }

  private asSeoMeta(value: unknown): LandingContext["seoMeta"] {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const input = value as Record<string, unknown>;
    return {
      title: typeof input.title === "string" ? input.title : undefined,
      description: typeof input.description === "string" ? input.description : undefined,
      ogImage: typeof input.ogImage === "string" ? input.ogImage : undefined,
      canonical: typeof input.canonical === "string" ? input.canonical : undefined
    };
  }

  private computeDiscount(price: number, oldPrice: number): string | null {
    if (!(oldPrice > 0) || !(oldPrice > price)) return null;
    const percent = Math.round(((oldPrice - price) / oldPrice) * 100);
    return String(percent);
  }
}

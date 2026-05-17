import { Injectable } from "@nestjs/common";
import type { LandingContext } from "@workspace/types";

import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class LandingContextResolver {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(landingId: string): Promise<LandingContext> {
    const landing = await this.prisma.landing.findUniqueOrThrow({
      where: { id: landingId },
      include: {
        currentVersion: true,
        geo: true,
        product: true
      }
    });

    const now = new Date();
    const [geoPrice, globalPrice] = landing.productId
      ? await Promise.all([
          this.prisma.price.findFirst({
            where: {
              productId: landing.productId,
              geoId: landing.geoId,
              validFrom: { lte: now },
              OR: [{ validTo: null }, { validTo: { gt: now } }]
            },
            orderBy: { validFrom: "desc" }
          }),
          this.prisma.price.findFirst({
            where: {
              productId: landing.productId,
              geoId: null,
              validFrom: { lte: now },
              OR: [{ validTo: null }, { validTo: { gt: now } }]
            },
            orderBy: { validFrom: "desc" }
          })
        ])
      : [null, null];

    const activePrice = geoPrice ?? globalPrice;
    const versionPlaceholders = this.asStringRecord(landing.currentVersion?.placeholders);
    const landingPlaceholders = this.asStringRecord(landing.settings);
    const placeholders = { ...versionPlaceholders, ...landingPlaceholders };

    return {
      landingId: landing.id,
      slug: landing.slug,
      geoId: landing.geoId,
      lang: landing.geo.language,
      dir: "ltr",
      productId: landing.productId,
      productName: landing.product?.name ?? null,
      productImage: landing.product?.defaultImage ?? null,
      price: activePrice?.price?.toString() ?? null,
      oldPrice: activePrice?.oldPrice?.toString() ?? null,
      currency: activePrice?.currency ?? null,
      discount:
        activePrice?.price && activePrice.oldPrice
          ? this.computeDiscount(
              activePrice.price.toNumber(),
              activePrice.oldPrice.toNumber()
            )
          : null,
      templateId: landing.templateId,
      placeholders,
      i18n: {},
      pixels: this.asStringRecordOrNull(landing.pixels),
      postbacks: this.asStringRecordOrNull(landing.postbacks),
      seoMeta: this.asSeoMeta(landing.seoMeta),
      settings: this.asUnknownRecord(landing.settings),
      versionId: landing.currentVersionId,
      resolvedAt: now.toISOString()
    };
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

import { describe, expect, it } from "vitest";

process.env.JWT_ACCESS_SECRET = "test-access-secret-1234567890123456";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-123456789012345";

type DecLike = { toNumber(): number; toString(): string };

function dec(value: number): DecLike {
  return {
    toNumber: () => value,
    toString: () => String(value)
  };
}

type Snapshot = {
  landing: {
    id: string;
    slug: string;
    geoId: string;
    templateId: string | null;
    currentVersionId: string | null;
    productId: string | null;
    settings: Record<string, unknown>;
    pixels: unknown;
    postbacks: unknown;
    seoMeta: unknown;
    currentVersion: { placeholders: Record<string, unknown> } | null;
    geo: { language: string; currency: string };
    product: {
      id: string;
      name: string;
      defaultImage: string | null;
      claimsKey: string | null;
    } | null;
  };
  prices: Array<{
    geoId: string | null;
    currency: string;
    price: DecLike;
    oldPrice: DecLike | null;
    validFrom: Date;
    validTo: Date | null;
  }>;
  i18n: Array<{ key: string; lang: string; value: string }>;
};

async function createResolver(snapshot: Snapshot) {
  const { LandingContextResolver } = await import("./landing-context.resolver");
  const tx = {
    landing: {
      findUniqueOrThrow: async () => snapshot.landing
    },
    price: {
      findMany: async ({ where }: { where: { validFrom: { lte: Date } } }) =>
        snapshot.prices
          .filter((row) => row.validFrom <= where.validFrom.lte)
          .sort((a, b) => b.validFrom.getTime() - a.validFrom.getTime())
    },
    i18nString: {
      findMany: async ({
        where
      }: {
        where: { key?: { in: string[] }; lang: { in: string[] } };
      }) =>
        snapshot.i18n.filter(
          (row) =>
            where.lang.in.includes(row.lang) &&
            (!where.key?.in?.length || where.key.in.includes(row.key))
        )
    }
  };

  const prisma = {
    $transaction: async <T>(fn: (trx: typeof tx) => Promise<T>) => fn(tx)
  };

  return new LandingContextResolver(prisma as never);
}

function baseSnapshot(): Snapshot {
  return {
    landing: {
      id: "landing_1",
      slug: "landing-1",
      geoId: "geo_de",
      templateId: "tpl_1",
      currentVersionId: "v1",
      productId: "prod_1",
      settings: {},
      pixels: null,
      postbacks: null,
      seoMeta: null,
      currentVersion: { placeholders: { cta: "global" } },
      geo: { language: "de", currency: "EUR" },
      product: {
        id: "prod_1",
        name: "Product",
        defaultImage: null,
        claimsKey: "claims.prostate"
      }
    },
    prices: [
      {
        geoId: "geo_de",
        currency: "EUR",
        price: dec(39),
        oldPrice: dec(55),
        validFrom: new Date("2026-01-01T00:00:00.000Z"),
        validTo: null
      }
    ],
    i18n: [
      { key: "cta.buy", lang: "en", value: "Buy now" },
      { key: "cta.buy", lang: "de", value: "Jetzt kaufen" },
      { key: "claims.prostate", lang: "en", value: "English claim" },
      { key: "claims.prostate", lang: "de", value: "German claim" }
    ]
  };
}

describe("LandingContextResolver", () => {
  const rows = [
    { name: "global base", settings: {}, key: "cta", expected: "global" },
    {
      name: "geo overrides global",
      settings: { geo: { geo_de: { cta: "geo" } } },
      key: "cta",
      expected: "geo"
    },
    {
      name: "product overrides geo",
      settings: {
        geo: { geo_de: { cta: "geo" } },
        product: { prod_1: { cta: "product" } }
      },
      key: "cta",
      expected: "product"
    },
    {
      name: "price overrides product",
      settings: { product: { prod_1: { price: "999" } } },
      key: "price",
      expected: "39"
    },
    {
      name: "landing overrides price",
      settings: { landing: { overrides: { price: "41" } } },
      key: "price",
      expected: "41"
    },
    { name: "discount from price", settings: {}, key: "discount", expected: "29" },
    { name: "oldPrice from active", settings: {}, key: "oldPrice", expected: "55" },
    { name: "currency from active", settings: {}, key: "currency", expected: "EUR" },
    {
      name: "currency fallback geo",
      settings: {},
      key: "currency",
      expected: "EUR",
      noPrices: true
    },
    {
      name: "missing i18n falls back to en",
      settings: { i18n: { keys: ["only.en"] } },
      i18n: [{ key: "only.en", lang: "en", value: "Only english" }],
      i18nKey: "only.en",
      i18nExpected: "Only english"
    },
    {
      name: "localized i18n beats en",
      settings: { i18n: { keys: ["cta.buy"] } },
      i18nKey: "cta.buy",
      i18nExpected: "Jetzt kaufen"
    },
    {
      name: "claims key auto added",
      settings: { i18n: { keys: [] } },
      i18nKey: "claims.prostate",
      i18nExpected: "German claim"
    },
    {
      name: "direct geo record supported",
      settings: { geo: { cta: "geo-direct" } },
      key: "cta",
      expected: "geo-direct"
    },
    {
      name: "direct product record supported",
      settings: { product: { cta: "product-direct" } },
      key: "cta",
      expected: "product-direct"
    },
    {
      name: "landing overrides final",
      settings: {
        global: { x: "g" },
        geo: { geo_de: { x: "geo" } },
        product: { prod_1: { x: "prod" } },
        landing: { overrides: { x: "final" } }
      },
      key: "x",
      expected: "final"
    },
    {
      name: "resolvedAt equals at",
      settings: {},
      at: new Date("2025-04-01T10:00:00.000Z"),
      resolvedAt: "2025-04-01T10:00:00.000Z"
    },
    {
      name: "historical price at past date",
      settings: {},
      at: new Date("2025-01-10T00:00:00.000Z"),
      oldPrices: true,
      key: "price",
      expected: "29"
    },
    {
      name: "geo price preferred over global",
      settings: {},
      twoPrices: true,
      key: "price",
      expected: "39"
    },
    {
      name: "global price when no geo",
      settings: {},
      key: "price",
      expected: "31",
      globalOnly: true
    },
    { name: "product metadata exposed", settings: {}, checkProduct: true },
    { name: "seo meta parsed", settings: {}, seoMeta: { title: "T" }, seoExpected: "T" }
  ] as const;

  it.each(rows)("resolves row: $name", async (row) => {
    const snap = baseSnapshot();
    snap.landing.settings = row.settings as Record<string, unknown>;

    if ((row as { noPrices?: boolean }).noPrices) snap.prices = [];
    if ("i18n" in row && row.i18n) snap.i18n = [...row.i18n];
    if ((row as { globalOnly?: boolean }).globalOnly) {
      snap.prices = [
        {
          geoId: null,
          currency: "EUR",
          price: dec(31),
          oldPrice: null,
          validFrom: new Date("2025-01-01T00:00:00.000Z"),
          validTo: null
        }
      ];
    }
    if ((row as { oldPrices?: boolean }).oldPrices) {
      snap.prices = [
        {
          geoId: "geo_de",
          currency: "EUR",
          price: dec(29),
          oldPrice: dec(45),
          validFrom: new Date("2024-12-01T00:00:00.000Z"),
          validTo: new Date("2025-02-01T00:00:00.000Z")
        },
        ...snap.prices
      ];
    }
    if ((row as { twoPrices?: boolean }).twoPrices) {
      snap.prices = [
        ...snap.prices,
        {
          geoId: null,
          currency: "EUR",
          price: dec(33),
          oldPrice: null,
          validFrom: new Date("2026-01-01T00:00:00.000Z"),
          validTo: null
        }
      ];
    }
    if ((row as { seoMeta?: { title: string } }).seoMeta) {
      snap.landing.seoMeta = (row as { seoMeta: { title: string } }).seoMeta;
    }

    const resolver = await createResolver(snap);
    const at = (row as { at?: Date }).at ?? new Date("2026-03-01T00:00:00.000Z");
    const context = await resolver.resolve("landing_1", at);

    if ((row as { key?: string; expected?: string }).key) {
      expect(context.placeholders[(row as { key: string }).key]).toBe(
        (row as { expected: string }).expected
      );
    }
    if ((row as { i18nKey?: string; i18nExpected?: string }).i18nKey) {
      expect(context.i18n[(row as { i18nKey: string }).i18nKey]).toBe(
        (row as { i18nExpected: string }).i18nExpected
      );
    }
    if ((row as { resolvedAt?: string }).resolvedAt) {
      expect(context.resolvedAt).toBe((row as { resolvedAt: string }).resolvedAt);
    }
    if ((row as { checkProduct?: boolean }).checkProduct) {
      expect(context.productId).toBe("prod_1");
      expect(context.productName).toBe("Product");
    }
    if ((row as { seoExpected?: string }).seoExpected) {
      expect(context.seoMeta?.title).toBe((row as { seoExpected: string }).seoExpected);
    }
  });

  it("keeps p50 under 5ms for 20 i18n keys", async () => {
    const snap = baseSnapshot();
    const keys = Array.from({ length: 20 }, (_, idx) => `k.${idx}`);
    snap.landing.settings = { i18n: { keys } };
    snap.i18n = keys.flatMap((key) => [
      { key, lang: "en", value: `${key}-en` },
      { key, lang: "de", value: `${key}-de` }
    ]);

    const resolver = await createResolver(snap);
    const samples: number[] = [];

    for (let index = 0; index < 50; index += 1) {
      const started = performance.now();
      await resolver.resolve("landing_1", new Date("2026-03-01T00:00:00.000Z"));
      samples.push(performance.now() - started);
    }

    const sorted = [...samples].sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length / 2)] ?? 0;

    expect(p50).toBeLessThan(5);
  });
});

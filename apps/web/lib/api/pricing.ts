import { apiClient } from "./client";
import { fetchGeoOptions } from "./landings";

export type PricingCell = {
  productId: string;
  productName: string;
  geoCode: string;
  geoName: string;
  priceId: string | null;
  price: string | null;
  oldPrice: string | null;
  currency: string;
  validFrom: string | null;
  hasScheduled: boolean;
  nextScheduledAt: string | null;
};

export type PricingBulkOperation = "set" | "percent";

export type PricingBulkPayload = {
  productIds: string[];
  geoCodes: string[];
  operation: PricingBulkOperation;
  value: string;
  validFrom: string;
  currency?: string;
  notes?: string;
};

export async function createProductPricePeriod(input: {
  productId: string;
  geoCode: string;
  price: string;
  oldPrice?: string;
  currency: string;
  validFrom: string;
  notes?: string;
}) {
  const response = await apiClient.post(`/products/${input.productId}/prices`, {
    geoCode: input.geoCode,
    price: input.price,
    oldPrice: input.oldPrice,
    currency: input.currency,
    validFrom: input.validFrom,
    notes: input.notes
  });

  return response.data;
}

export async function applyBulkPricing(input: PricingBulkPayload) {
  const response = await apiClient.post<{ createdCount: number; ids: string[] }>(
    "/pricing/bulk",
    input
  );

  return response.data;
}

export async function loadPricingMatrix(params?: {
  productTake?: number;
  geoCodes?: string[];
  search?: string;
}) {
  const productsResp = await apiClient.get<{
    items: Array<{ id: string; name: string }>;
  }>("/products", {
    params: {
      take: params?.productTake ?? 20,
      q: params?.search || undefined
    }
  });

  const allGeos = await fetchGeoOptions();
  const geos = params?.geoCodes?.length
    ? allGeos.filter((geo) => params.geoCodes?.includes(geo.code))
    : allGeos.slice(0, 8);

  const now = new Date();

  const histories = await Promise.all(
    productsResp.data.items.flatMap((product) =>
      geos.map(async (geo) => {
        const response = await apiClient.get<{
          items: Array<{
            id: string;
            price: string;
            oldPrice: string | null;
            currency: string;
            validFrom: string;
          }>;
        }>(`/products/${product.id}/prices`, {
          params: { geoCode: geo.code, take: 20 }
        });

        const rows = response.data.items;
        const active =
          rows.find((row) => new Date(row.validFrom) <= now) ?? rows.at(-1) ?? null;
        const nextScheduled =
          rows
            .filter((row) => new Date(row.validFrom) > now)
            .sort(
              (a, b) => new Date(a.validFrom).getTime() - new Date(b.validFrom).getTime()
            )[0] ?? null;

        const cell: PricingCell = {
          productId: product.id,
          productName: product.name,
          geoCode: geo.code,
          geoName: geo.name,
          priceId: active?.id ?? null,
          price: active?.price ?? null,
          oldPrice: active?.oldPrice ?? null,
          currency: active?.currency ?? "EUR",
          validFrom: active?.validFrom ?? null,
          hasScheduled: Boolean(nextScheduled),
          nextScheduledAt: nextScheduled?.validFrom ?? null
        };

        return cell;
      })
    )
  );

  return {
    products: productsResp.data.items,
    geos,
    cells: histories
  };
}

export async function countAffectedPublishedLandings(input: {
  geoCodes: string[];
  productIds: string[];
}) {
  if (!input.productIds.length || !input.geoCodes.length) {
    return 0;
  }

  const totals = await Promise.all(
    input.productIds.map(async (productId) => {
      const response = await apiClient.get<{
        meta: { total: number };
      }>("/landings", {
        params: {
          geo: input.geoCodes.join(","),
          limit: 1,
          page: 1,
          productId,
          status: "PUBLISHED"
        }
      });
      return response.data.meta.total;
    })
  );

  return totals.reduce((sum, count) => sum + count, 0);
}

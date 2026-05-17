import { apiClient } from "./api/client";

export type CursorListResponse<T> = {
  items: T[];
  nextCursor: string | null;
};

export type ProductRow = {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  categoryId?: string | null;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  category?: {
    id: string;
    slug: string;
    name: string;
    color?: string | null;
  } | null;
};

export type PriceRow = {
  id: string;
  productId: string;
  geoId?: string | null;
  price: string;
  oldPrice?: string | null;
  currency: string;
  validFrom: string;
  validTo?: string | null;
  notes?: string | null;
  createdAt: string;
  geo?: {
    id: string;
    code: string;
    name: string;
  } | null;
};

export type LandingOriginFilter = "NATIVE" | "WRAPPED" | "IMPORTED";
export type LandingStatus = "DRAFT" | "IN_REVIEW" | "PUBLISHED" | "ARCHIVED";

export type LandingRow = {
  id: string;
  publicId: string;
  name: string;
  slug: string;
  status: LandingStatus;
  origin: "NATIVE" | "WRAPPED_LEGACY";
  productId?: string | null;
  updatedAt: string;
  geo?: { id: string; code: string; name: string } | null;
  category?: { id: string; slug: string; name: string } | null;
  variant?: { id: string; slug: string; name: string } | null;
  legacyFrom?: { source?: string | null } | null;
};

export type LandingDetail = LandingRow & {
  notes?: string | null;
  settings?: unknown;
  seoMeta?: unknown;
  pixels?: unknown;
  postbacks?: unknown;
  currentVersion?: {
    id: string;
    versionNum: number;
    status: string;
  } | null;
};

export type LandingEditorNode = {
  id: string;
  kind: string;
  props: Record<string, unknown>;
};

export type LandingEditorContext = {
  widgets: LandingEditorNode[];
};

export type LandingVersion = {
  id: string;
  versionNum: number;
  status: string;
  message?: string | null;
  createdAt: string;
  author?: {
    id: string;
    email: string;
    name?: string | null;
  } | null;
};

export type VersionDiffResponse = {
  fromId: string;
  toId: string;
  fields: Array<{ field: string; changed: boolean; from: unknown; to: unknown }>;
  priceHighlights: Array<{
    key: "price" | "oldPrice" | "discount" | "currency";
    from: string | null;
    to: string | null;
    changed: boolean;
  }>;
};

export function createServerApiClient() {
  return apiClient;
}

export async function fetchProducts(params: {
  category?: string;
  q?: string;
  cursor?: string;
  take?: number;
}) {
  const response = await apiClient.get<CursorListResponse<ProductRow>>("/products", {
    params: {
      category: params.category || undefined,
      cursor: params.cursor || undefined,
      q: params.q || undefined,
      take: params.take ?? 20
    }
  });
  return response.data;
}

export async function fetchProduct(id: string) {
  const response = await apiClient.get<ProductRow>(`/products/${id}`);
  return response.data;
}

export async function fetchProductPriceHistory(
  productId: string,
  params: { cursor?: string; take?: number; geoCode?: string }
) {
  const response = await apiClient.get<CursorListResponse<PriceRow>>(
    `/products/${productId}/prices`,
    {
      params: {
        cursor: params.cursor || undefined,
        geoCode: params.geoCode || undefined,
        take: params.take ?? 20
      }
    }
  );
  return response.data;
}

export async function fetchLandings(params: {
  cursor?: string;
  take?: number;
  geo?: string;
  productId?: string;
  status?: LandingStatus;
  origin?: LandingOriginFilter;
}) {
  const response = await apiClient.get<{
    items: LandingRow[];
    meta: { page: number; pageCount: number };
  }>("/landings", {
    params: {
      geo: params.geo || undefined,
      limit: params.take ?? 20,
      origin: undefined,
      page: params.cursor ? Number(params.cursor) : 1,
      productId: params.productId || undefined,
      status: params.status || undefined
    }
  });
  const payload = response.data;
  const nextPage =
    payload.meta.page < payload.meta.pageCount ? String(payload.meta.page + 1) : null;
  return {
    items: payload.items,
    nextCursor: nextPage
  } satisfies CursorListResponse<LandingRow>;
}

export async function fetchLanding(id: string) {
  const response = await apiClient.get<LandingDetail>(`/landings/${id}`);
  return response.data;
}

export async function fetchLandingRawContext(id: string) {
  const response = await apiClient.get<unknown>(`/landings/${id}/context`);
  return response.data;
}

export async function fetchLandingVersions(
  landingId: string,
  params?: { cursor?: string; take?: number }
) {
  const response = await apiClient.get<CursorListResponse<LandingVersion>>(
    `/landings/${landingId}/versions`,
    {
      params: {
        cursor: params?.cursor || undefined,
        take: params?.take ?? 20
      }
    }
  );
  return response.data;
}

export async function restoreLandingVersion(versionId: string) {
  const response = await apiClient.post<LandingVersion>(`/versions/${versionId}/restore`);
  return response.data;
}

export async function fetchVersionDiff(fromId: string, toId: string) {
  const response = await apiClient.get<VersionDiffResponse>(
    `/versions/${fromId}/diff/${toId}`
  );
  return response.data;
}

export async function patchLandingEditorContext(
  id: string,
  context: LandingEditorContext
) {
  const payload = { context };

  try {
    const response = await apiClient.patch<LandingDetail>(`/v1/landings/${id}`, payload);
    return response.data;
  } catch {
    const fallback = await apiClient.patch<LandingDetail>(`/landings/${id}`, payload);
    return fallback.data;
  }
}

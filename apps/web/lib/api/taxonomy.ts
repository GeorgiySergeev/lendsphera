import axios from "axios";

import { apiClient } from "./client";
import type {
  CategoryFormValues,
  GeoCsvRow,
  GeoFormValues,
  VariantFormValues
} from "../taxonomy/schemas";

type ListMeta = {
  total: number;
  page: number;
  limit: number;
  pageCount: number;
};

type ListResponse<T> = {
  items: T[];
  meta: ListMeta;
};

type TaxonomyCounts = {
  landings: number;
  templates?: number;
};

type GeoTaxonomyItem = GeoFormValues & {
  id: string;
  sortOrder: number;
  _count: TaxonomyCounts;
};

type CategoryTaxonomyItem = CategoryFormValues & {
  id: string;
  sortOrder: number;
  _count: TaxonomyCounts;
};

type VariantTaxonomyItem = VariantFormValues & {
  id: string;
  sortOrder: number;
  _count: TaxonomyCounts;
};

type TaxonomyListFilters = {
  limit?: number;
  page?: number;
  search?: string;
};

type GeoImportResult = {
  created: number;
  updated: number;
  errors: Array<{ code?: string; message: string; row: number }>;
};

type TaxonomyKind = "geos" | "categories" | "variants";

type TaxonomyItem = GeoTaxonomyItem | CategoryTaxonomyItem | VariantTaxonomyItem;

const taxonomyQueryKeys = {
  categories: (filters: TaxonomyListFilters = {}) =>
    ["taxonomy", "categories", filters] as const,
  geos: (filters: TaxonomyListFilters = {}) => ["taxonomy", "geos", filters] as const,
  variants: (filters: TaxonomyListFilters = {}) =>
    ["taxonomy", "variants", filters] as const
};

function serializeTaxonomyListParams(filters: TaxonomyListFilters = {}) {
  return {
    limit: filters.limit ?? 100,
    page: filters.page ?? 1,
    search: filters.search?.trim() || undefined
  };
}

async function fetchGeos(filters: TaxonomyListFilters = {}) {
  const response = await apiClient.get<ListResponse<GeoTaxonomyItem>>("/geos", {
    params: serializeTaxonomyListParams(filters)
  });

  return response.data;
}

async function fetchCategories(filters: TaxonomyListFilters = {}) {
  const response = await apiClient.get<ListResponse<CategoryTaxonomyItem>>(
    "/categories",
    { params: serializeTaxonomyListParams(filters) }
  );

  return response.data;
}

async function fetchVariants(filters: TaxonomyListFilters = {}) {
  const response = await apiClient.get<ListResponse<VariantTaxonomyItem>>("/variants", {
    params: serializeTaxonomyListParams(filters)
  });

  return response.data;
}

async function createGeo(payload: GeoFormValues) {
  const response = await apiClient.post<GeoTaxonomyItem>("/geos", cleanPayload(payload));

  return response.data;
}

async function updateGeo(id: string, payload: GeoFormValues) {
  const response = await apiClient.patch<GeoTaxonomyItem>(
    `/geos/${id}`,
    cleanPayload(payload)
  );

  return response.data;
}

async function createCategory(payload: CategoryFormValues) {
  const response = await apiClient.post<CategoryTaxonomyItem>(
    "/categories",
    cleanPayload(payload)
  );

  return response.data;
}

async function updateCategory(id: string, payload: CategoryFormValues) {
  const response = await apiClient.patch<CategoryTaxonomyItem>(
    `/categories/${id}`,
    cleanPayload(payload)
  );

  return response.data;
}

async function createVariant(payload: VariantFormValues) {
  const response = await apiClient.post<VariantTaxonomyItem>(
    "/variants",
    cleanPayload(payload)
  );

  return response.data;
}

async function updateVariant(id: string, payload: VariantFormValues) {
  const response = await apiClient.patch<VariantTaxonomyItem>(
    `/variants/${id}`,
    cleanPayload(payload)
  );

  return response.data;
}

async function deleteTaxonomyItem(kind: TaxonomyKind, id: string) {
  const response = await apiClient.delete<TaxonomyItem>(`/${kind}/${id}`);

  return response.data;
}

async function reorderTaxonomyItems(kind: TaxonomyKind, ids: string[]) {
  const response = await apiClient.patch<{ count: number }>(`/${kind}/reorder`, {
    ids
  });

  return response.data;
}

async function importGeos(rows: GeoCsvRow[]) {
  const response = await apiClient.post<GeoImportResult>("/geos/import", { rows });

  return response.data;
}

function getLandingConflictCount(error: unknown) {
  if (!axios.isAxiosError(error)) {
    return null;
  }

  const data = error.response?.data;

  if (typeof data === "object" && data && "landingCount" in data) {
    const count = Number(data.landingCount);

    return Number.isFinite(count) ? count : null;
  }

  if (
    typeof data === "object" &&
    data &&
    "message" in data &&
    typeof data.message === "object" &&
    data.message &&
    "landingCount" in data.message
  ) {
    const count = Number(data.message.landingCount);

    return Number.isFinite(count) ? count : null;
  }

  return null;
}

function getDeleteConflictMessage(kindLabel: string, error: unknown) {
  const landingCount = getLandingConflictCount(error);

  if (landingCount === null) {
    return "Unable to delete the record. Check related resources and try again.";
  }

  return `${kindLabel} is used by ${landingCount} active landing${
    landingCount === 1 ? "" : "s"
  }. Remove or reassign those landings first.`;
}

function cleanPayload<T extends Record<string, unknown>>(payload: T) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== "")
  ) as T;
}

export {
  createCategory,
  createGeo,
  createVariant,
  deleteTaxonomyItem,
  fetchCategories,
  fetchGeos,
  fetchVariants,
  getDeleteConflictMessage,
  getLandingConflictCount,
  importGeos,
  reorderTaxonomyItems,
  serializeTaxonomyListParams,
  taxonomyQueryKeys,
  updateCategory,
  updateGeo,
  updateVariant
};
export type {
  CategoryTaxonomyItem,
  GeoImportResult,
  GeoTaxonomyItem,
  ListResponse,
  TaxonomyItem,
  TaxonomyKind,
  TaxonomyListFilters,
  VariantTaxonomyItem
};

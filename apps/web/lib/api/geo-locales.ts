import { apiClient } from "./client";

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

type GeoLocaleListItem = {
  locale: string;
  countryCode: string;
  countryNameLocal: string;
  languageCode: string;
  continent: string;
  region: string;
  catalogGeoId: string | null;
  landingCount: number;
};

type GeoCountryCatalogMeta = {
  countryCode: string;
  catalogGeoId: string | null;
  landingCount: number;
};

const geoLocalesQueryKeys = {
  countryMeta: (code: string) => ["geo-locales", "country-meta", code] as const,
  list: (filters: { page: number; limit: number }) =>
    ["geo-locales", "list", filters] as const
};

async function fetchGeoLocalesList(filters: {
  page: number;
  limit: number;
}): Promise<ListResponse<GeoLocaleListItem>> {
  const response = await apiClient.get<ListResponse<GeoLocaleListItem>>("/geos/locales", {
    params: { page: filters.page, limit: filters.limit }
  });

  return response.data;
}

async function fetchGeoCountryCatalogMeta(code: string): Promise<GeoCountryCatalogMeta> {
  const response = await apiClient.get<GeoCountryCatalogMeta>(
    `/geos/locales/countries/${encodeURIComponent(code)}/meta`
  );

  return response.data;
}

export { fetchGeoCountryCatalogMeta, fetchGeoLocalesList, geoLocalesQueryKeys };
export type { GeoCountryCatalogMeta, GeoLocaleListItem, ListResponse };

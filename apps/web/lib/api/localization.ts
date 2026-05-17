import { apiClient } from "./client";

export type I18nGridRow = {
  key: string;
  namespace: string;
  context: string | null;
  translations: Record<string, string | null>;
  missingFor: boolean;
};

export type I18nListResponse = {
  items: I18nGridRow[];
  meta: {
    total: number;
    page: number;
    limit: number;
    pageCount: number;
  };
};

export type I18nReviewItem = {
  id: string;
  key: string;
  lang: string;
  mtValue: string;
  context: string | null;
  updatedAt: string;
  source: {
    lang: string;
    value: string;
    updatedAt: string;
  } | null;
};

export type I18nReviewResponse = {
  items: I18nReviewItem[];
  meta: {
    take: number;
    cursor: number;
    nextCursor: number | null;
  };
};

export const localizationApi = {
  async list(params: {
    page?: number;
    limit?: number;
    search?: string;
    namespace?: string;
    lang?: string;
    missingFor?: string;
  }) {
    const response = await apiClient.get<I18nListResponse>("/v1/i18n", { params });
    return response.data;
  },

  async upsert(input: { key: string; lang: string; value: string; context?: string }) {
    const response = await apiClient.post("/v1/i18n", input);
    return response.data;
  },

  async rename(input: { oldKey: string; newKey: string }) {
    const response = await apiClient.patch("/v1/i18n/rename", input);
    return response.data;
  },

  async missing(params: { lang: string; namespace?: string; search?: string }) {
    const response = await apiClient.get<{
      lang: string;
      count: number;
      items: string[];
    }>("/v1/i18n/missing", { params });
    return response.data;
  },

  async listReviewQueue(params: { take?: number; cursor?: number; lang?: string }) {
    const response = await apiClient.get<I18nReviewResponse>("/v1/i18n/review/pending", {
      params
    });
    return response.data;
  },

  async approveReview(input: { id: string; value?: string }) {
    const response = await apiClient.post(`/v1/i18n/review/${input.id}/approve`, {
      value: input.value
    });
    return response.data;
  },

  async rejectReview(input: { id: string; reason: string }) {
    const response = await apiClient.post(`/v1/i18n/review/${input.id}/reject`, {
      reason: input.reason
    });
    return response.data;
  }
};

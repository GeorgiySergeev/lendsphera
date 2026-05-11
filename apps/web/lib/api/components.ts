import { apiClient } from "./client";
import type {
  ComponentCategory,
  ComponentDetail,
  ComponentListItem,
  ComponentVariant,
  ComponentsQueryParams,
  CreateComponentDto,
  CreateVariantDto,
  PaginatedResponse,
  UpdateComponentDto
} from "@workspace/types";

const repeatArrayParams = (params: Record<string, unknown>) => {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        search.append(key, String(item));
      }
      continue;
    }

    search.append(key, String(value));
  }

  return search.toString();
};

export const componentsApi = {
  async listCategories() {
    const response = await apiClient.get<ComponentCategory[]>("/component-categories");

    return response.data;
  },

  async list(params?: ComponentsQueryParams) {
    const response = await apiClient.get<PaginatedResponse<ComponentListItem>>(
      "/components",
      {
        params,
        paramsSerializer: repeatArrayParams
      }
    );

    return response.data;
  },

  async get(id: string) {
    const response = await apiClient.get<ComponentDetail>(`/components/${id}`);

    return response.data;
  },

  async create(body: CreateComponentDto) {
    const response = await apiClient.post<ComponentDetail>("/components", body);

    return response.data;
  },

  async update(id: string, body: UpdateComponentDto) {
    const response = await apiClient.patch<ComponentDetail>(`/components/${id}`, body);

    return response.data;
  },

  async delete(id: string) {
    await apiClient.delete<void>(`/components/${id}`);
  },

  async duplicate(id: string) {
    const response = await apiClient.post<ComponentDetail>(`/components/${id}/duplicate`);

    return response.data;
  },

  async trackUsage(id: string) {
    await apiClient.post<void>(`/components/${id}/use`);
  },

  async createVariant(componentId: string, body: CreateVariantDto) {
    const response = await apiClient.post<ComponentVariant>(
      `/components/${componentId}/variants`,
      body
    );

    return response.data;
  },

  async updateVariant(
    componentId: string,
    variantId: string,
    body: Partial<CreateVariantDto>
  ) {
    const response = await apiClient.patch<ComponentVariant>(
      `/components/${componentId}/variants/${variantId}`,
      body
    );

    return response.data;
  },

  async deleteVariant(componentId: string, variantId: string) {
    await apiClient.delete<void>(`/components/${componentId}/variants/${variantId}`);
  }
};

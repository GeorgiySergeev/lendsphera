import type {
  CreateWidgetDto,
  CreateWidgetVersionDto,
  PaginatedResponse,
  UpdateWidgetDto,
  WidgetLibraryDetail,
  WidgetLibraryListItem,
  WidgetsListApiResponse,
  WidgetsQueryParams,
  WidgetVersionSummary
} from "@workspace/types";

import { apiClient } from "./client";

function toPaginated(
  items: WidgetLibraryListItem[],
  meta: WidgetsListApiResponse["meta"]
): PaginatedResponse<WidgetLibraryListItem> {
  return {
    data: items,
    total: meta.total,
    page: meta.page,
    limit: meta.limit,
    totalPages: meta.pageCount
  };
}

export const widgetsApi = {
  async list(params?: WidgetsQueryParams) {
    const response = await apiClient.get<WidgetsListApiResponse>("/widgets", { params });

    return toPaginated(response.data.items, response.data.meta);
  },

  async get(id: string) {
    const response = await apiClient.get<WidgetLibraryDetail>(`/widgets/${id}`);

    return response.data;
  },

  async create(body: CreateWidgetDto) {
    const response = await apiClient.post<WidgetLibraryListItem>("/widgets", body);

    return response.data;
  },

  async update(id: string, body: UpdateWidgetDto) {
    const response = await apiClient.patch<WidgetLibraryListItem>(`/widgets/${id}`, body);

    return response.data;
  },

  async delete(id: string) {
    await apiClient.delete<void>(`/widgets/${id}`);
  },

  async listVersions(widgetId: string) {
    const response = await apiClient.get<WidgetVersionSummary[]>(
      `/widgets/${widgetId}/versions`
    );

    return response.data;
  },

  async createVersion(widgetId: string, body: CreateWidgetVersionDto) {
    const response = await apiClient.post<WidgetVersionSummary>(
      `/widgets/${widgetId}/versions`,
      body
    );

    return response.data;
  },

  async markVersionLatest(versionId: string) {
    const response = await apiClient.post<WidgetVersionSummary>(
      `/widgets/versions/${versionId}/latest`
    );

    return response.data;
  }
};

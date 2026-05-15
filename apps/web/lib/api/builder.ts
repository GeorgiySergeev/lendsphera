import type {
  BuilderPageDetail,
  BuilderPageSummary,
  BuilderPageVersion,
  CreateBuilderPageDto,
  SaveBuilderDraftDto,
  UpdateBuilderPageDto
} from "@workspace/types";

import { apiClient } from "./client";

export const builderApi = {
  async list() {
    const response = await apiClient.get<BuilderPageSummary[]>("/builder/pages");

    return response.data;
  },

  async latest() {
    const response = await apiClient.get<BuilderPageDetail | null>(
      "/builder/pages/latest"
    );

    return response.data;
  },

  async create(body: CreateBuilderPageDto = {}) {
    const response = await apiClient.post<BuilderPageDetail>("/builder/pages", body);

    return response.data;
  },

  async get(id: string) {
    const response = await apiClient.get<BuilderPageDetail>(`/builder/pages/${id}`);

    return response.data;
  },

  async update(id: string, body: UpdateBuilderPageDto) {
    const response = await apiClient.patch<BuilderPageDetail>(
      `/builder/pages/${id}`,
      body
    );

    return response.data;
  },

  async saveDraft(id: string, body: SaveBuilderDraftDto) {
    const response = await apiClient.post<{
      id: string;
      createdAt: string;
      status: string;
      versionNum: number;
    }>(`/builder/pages/${id}/versions/draft`, body);

    return response.data;
  },

  async listVersions(id: string) {
    const response = await apiClient.get<BuilderPageVersion[]>(
      `/builder/pages/${id}/versions`
    );

    return response.data;
  },

  async duplicate(id: string) {
    const response = await apiClient.post<BuilderPageDetail>(
      `/builder/pages/${id}/duplicate`
    );

    return response.data;
  }
};

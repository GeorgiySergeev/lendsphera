"use client";

import { apiClient } from "./client";

export type AssetType = "IMAGE" | "VIDEO" | "DOCUMENT" | "FONT" | "OTHER";

export type AssetRecord = {
  createdAt: string;
  folder?: string | null;
  hash?: string | null;
  height?: number | null;
  id: string;
  landingId?: string | null;
  mimeType: string;
  originalName: string;
  size: number;
  tags: string[];
  type: AssetType;
  updatedAt: string;
  url?: string | null;
  width?: number | null;
};

export type AssetListParams = {
  folder?: string;
  limit?: number;
  page?: number;
  search?: string;
  tag?: string;
  type?: AssetType | "all";
};

export type AssetListResponse = {
  items: AssetRecord[];
  meta: {
    limit: number;
    page: number;
    pageCount: number;
    total: number;
  };
};

export const assetsApi = {
  async list(params: AssetListParams = {}): Promise<AssetListResponse> {
    const response = await apiClient.get("/assets", {
      params: {
        ...params,
        type: params.type === "all" ? undefined : params.type
      }
    });

    return response.data;
  }
};

"use client";

import { useQuery } from "@tanstack/react-query";

import { assetsApi, type AssetListParams } from "../lib/api/assets";

export const assetKeys = {
  all: ["assets"] as const,
  list: (params?: AssetListParams) => [...assetKeys.all, "list", params] as const
};

export function useAssets(params?: AssetListParams) {
  return useQuery({
    queryKey: assetKeys.list(params),
    queryFn: () => assetsApi.list(params)
  });
}

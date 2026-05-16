import { apiClient } from "./client";

/* ───────── TYPES ───────── */

export type AssetType = "IMAGE" | "VIDEO" | "FONT" | "DOCUMENT" | "ARCHIVE" | "OTHER";

export type MediaFolder = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  createdAt: string;
  childCount?: number;
};

export type MediaAsset = {
  id: string;
  originalName: string;
  mimeType: string;
  type: AssetType;
  url: string | null;
  s3Key: string;
  size: number;
  width: number | null;
  height: number | null;
  folderId: string | null;
  tags: string[];
  createdAt: string;
  uploader: {
    id: string;
    name: string | null;
    email: string;
  };
};

export type MediaListMeta = {
  total: number;
  page: number;
  limit: number;
  pageCount: number;
};

export type MediaListResponse = {
  items: MediaAsset[];
  meta: MediaListMeta;
};

export type MediaListParams = {
  folderId?: string | null;
  type?: AssetType;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: "createdAt" | "name" | "size";
  sortOrder?: "asc" | "desc";
};

/* ───────── HELPERS ───────── */

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  const value = bytes / Math.pow(k, i);
  return `${value.toFixed(value < 10 && i > 0 ? 1 : 0)} ${sizes[i]}`;
}

export function getAssetThumbnailUrl(asset: MediaAsset): string | null {
  return asset.type === "IMAGE" ? asset.url : null;
}

function cleanParams<T extends Record<string, unknown>>(
  params: T
): Record<string, string | number | boolean> {
  const result: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      result[key] = value as string | number | boolean;
    }
  }
  return result;
}

/* ───────── QUERY KEYS ───────── */

export const MEDIA_QUERY_KEYS = {
  folders: (parentId?: string | null) =>
    ["media", "folders", parentId ?? "root"] as const,
  list: (params: MediaListParams) => ["media", "list", params] as const,
  asset: (id: string) => ["media", "asset", id] as const
};

/* ───────── FOLDER API ───────── */

export async function fetchFolders(parentId?: string | null): Promise<MediaFolder[]> {
  const response = await apiClient.get<MediaFolder[]>("/media/folders", {
    params: parentId !== undefined && parentId !== null ? { parentId } : undefined
  });
  return response.data;
}

export async function createFolder(
  name: string,
  parentId?: string | null
): Promise<MediaFolder> {
  const response = await apiClient.post<MediaFolder>("/media/folders", {
    name,
    parentId: parentId ?? undefined
  });
  return response.data;
}

export async function renameFolder(id: string, name: string): Promise<MediaFolder> {
  const response = await apiClient.patch<MediaFolder>(`/media/folders/${id}`, {
    name
  });
  return response.data;
}

export async function moveFolder(
  id: string,
  parentId: string | null
): Promise<MediaFolder> {
  const response = await apiClient.patch<MediaFolder>(`/media/folders/${id}/move`, {
    parentId
  });
  return response.data;
}

export async function deleteFolder(id: string): Promise<void> {
  await apiClient.delete(`/media/folders/${id}`);
}

/* ───────── ASSET API ───────── */

export async function fetchMedia(params: MediaListParams): Promise<MediaListResponse> {
  const response = await apiClient.get<MediaListResponse>("/media", {
    params: cleanParams(params)
  });
  return response.data;
}

export async function uploadFiles(
  files: File[],
  folderId?: string | null,
  onProgress?: (percent: number) => void
): Promise<MediaAsset[]> {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  if (folderId !== undefined && folderId !== null) {
    formData.append("folderId", folderId);
  }

  const response = await apiClient.post<MediaAsset[]>("/media/upload", formData, {
    timeout: 120_000,
    onUploadProgress: (e) => {
      if (e.total && e.total > 0) {
        onProgress?.(Math.round((e.loaded / e.total) * 100));
      }
    }
  });

  return response.data;
}

export async function deleteAssets(assetIds: string[]): Promise<void> {
  await apiClient.post("/media/delete", { assetIds });
}

export async function moveAssets(
  assetIds: string[],
  folderId: string | null
): Promise<void> {
  await apiClient.post("/media/move", { assetIds, folderId });
}

export async function updateAsset(
  id: string,
  data: { tags?: string[]; folderId?: string | null }
): Promise<MediaAsset> {
  const response = await apiClient.patch<MediaAsset>(`/media/${id}`, data);
  return response.data;
}

export async function downloadAsset(asset: MediaAsset): Promise<void> {
  const response = await apiClient.get<Blob>(`/media/${asset.id}/content`, {
    params: { download: "1" },
    responseType: "blob"
  });

  const url = URL.createObjectURL(response.data);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = asset.originalName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

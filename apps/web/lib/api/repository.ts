import { apiClient } from "./client";
import type {
  CategoryOption,
  GeoOption,
  LandingRow,
  ListResponse,
  TemplateOption,
  VariantOption
} from "./landings";

type LegacySource = "UPLOAD" | "GIT_REPO" | "FTP" | "S3_IMPORT" | "ZIP";

type LegacyLanding = {
  id: string;
  name: string;
  path: string;
  source: LegacySource;
  sourceUrl?: string | null;
  branch?: string | null;
  commitSha?: string | null;
  lastSyncedAt?: string | null;
  syncStatus?: string | null;
  syncError?: string | null;
  sizeBytes: string;
  fileCount: number;
  tags: string[];
  geoHint?: string | null;
  categoryHint?: string | null;
  importedAsId?: string | null;
  importedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  importedAs?: LandingRow | null;
};

type LegacyTreeNode = {
  id: string;
  name: string;
  path: string;
  type: "folder" | "file";
  children?: LegacyTreeNode[];
};

type LegacyFile = {
  id: string;
  legacyLandingId: string;
  path: string;
  s3Key: string;
  size: number;
  mimeType?: string | null;
  extension?: string | null;
  textContent?: string | null;
  hash?: string | null;
  isBinary: boolean;
  createdAt: string;
  updatedAt: string;
  updatedById?: string | null;
};

type RepositoryFilesFilters = {
  folder?: string;
  limit: number;
  page: number;
  search?: string;
};

type ImportLandingPayload = {
  categoryId: string;
  geoId: string;
  name: string;
  publicId?: string;
  slug?: string;
  templateId?: string;
  variantId: string;
};

async function fetchLegacyLandings(search = "") {
  const response = await apiClient.get<ListResponse<LegacyLanding>>("/legacy", {
    params: { limit: 100, page: 1, search: search.trim() || undefined }
  });

  return response.data;
}

async function fetchLegacyTree(legacyLandingId: string) {
  const response = await apiClient.get<LegacyTreeNode[]>(
    `/legacy/${legacyLandingId}/tree`
  );

  return response.data;
}

async function fetchLegacyFiles(
  legacyLandingId: string,
  filters: RepositoryFilesFilters
) {
  const response = await apiClient.get<ListResponse<LegacyFile>>(
    `/legacy/${legacyLandingId}/files`,
    {
      params: {
        folder: filters.folder || undefined,
        limit: filters.limit,
        page: filters.page,
        search: filters.search?.trim() || undefined
      }
    }
  );

  return response.data;
}

async function fetchLegacyFileContent(fileId: string) {
  const response = await apiClient.get<{ content: string; file: LegacyFile }>(
    `/legacy/files/${fileId}/content`
  );

  return response.data;
}

async function saveLegacyFileContent(fileId: string, content: string) {
  const response = await apiClient.put<LegacyFile>(`/legacy/files/${fileId}/content`, {
    content
  });

  return response.data;
}

async function fetchLegacyPreviewHtml(fileId: string) {
  const response = await apiClient.get<string>(`/legacy/files/${fileId}/preview`, {
    responseType: "text"
  });

  return response.data;
}

async function uploadRepositoryFiles({
  files,
  legacyLandingId,
  name
}: {
  files: File[];
  legacyLandingId?: string;
  name?: string;
}) {
  const formData = new FormData();

  for (const file of files) {
    formData.append("files", file);
  }

  const response = await apiClient.post<LegacyLanding>("/legacy/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    params: {
      legacyLandingId,
      name
    }
  });

  return response.data;
}

async function connectGitRepository({ branch, url }: { branch?: string; url?: string }) {
  const response = await apiClient.post<LegacyLanding>("/legacy/git/connect", {
    branch,
    url
  });

  return response.data;
}

async function syncGitRepository(legacyLandingId: string) {
  const response = await apiClient.post<LegacyLanding>(`/legacy/${legacyLandingId}/sync`);

  return response.data;
}

async function importLegacyFileAsLanding(fileId: string, payload: ImportLandingPayload) {
  const response = await apiClient.post<LandingRow>(
    `/legacy/files/${fileId}/import-as-landing`,
    payload
  );

  return response.data;
}

export {
  connectGitRepository,
  fetchLegacyFileContent,
  fetchLegacyFiles,
  fetchLegacyLandings,
  fetchLegacyPreviewHtml,
  fetchLegacyTree,
  importLegacyFileAsLanding,
  saveLegacyFileContent,
  syncGitRepository,
  uploadRepositoryFiles
};
export type {
  CategoryOption,
  GeoOption,
  ImportLandingPayload,
  LegacyFile,
  LegacyLanding,
  LegacyTreeNode,
  RepositoryFilesFilters,
  TemplateOption,
  VariantOption
};

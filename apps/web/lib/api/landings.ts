import { apiClient } from "./client";
import type {
  LandingEditorLayout,
  PlaceholderSchema,
  PlaceholderValue
} from "@workspace/types";

type LandingStatus = "DRAFT" | "IN_REVIEW" | "PUBLISHED" | "ARCHIVED";
type LandingBulkOperation = "PUBLISH" | "PAUSE" | "REPLACE_PIXEL" | "SET_TEMPLATE";

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

type LandingListFilters = {
  geo: string[];
  category?: string;
  variant?: string;
  status?: LandingStatus;
  search?: string;
  page: number;
  limit: number;
};

type GeoOption = {
  id: string;
  code: string;
  name: string;
  flagEmoji?: string | null;
  flagUrl?: string | null;
};

type CategoryOption = {
  id: string;
  slug: string;
  name: string;
  color?: string | null;
};

type VariantOption = {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  icon?: string | null;
};

type TemplateOption = {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  previewUrl?: string | null;
  categoryId?: string | null;
  category?: CategoryOption | null;
};

type LandingRow = {
  id: string;
  publicId: string;
  name: string;
  slug: string;
  status: LandingStatus;
  previewUrl?: string | null;
  publishedUrl?: string | null;
  updatedAt: string;
  geo: GeoOption;
  category: CategoryOption;
  variant: VariantOption;
  template?: {
    id: string;
    name: string;
    thumbnailUrl?: string | null;
  } | null;
};

type LandingDetail = LandingRow & {
  owner?: {
    id: string;
    email: string;
    name?: string | null;
    role?: string;
  } | null;
  currentVersion?: LandingVersion | null;
  versions?: LandingVersion[];
};

type LandingVersion = {
  id: string;
  versionNum: number;
  status: string;
  message?: string | null;
  createdAt: string;
  author?: {
    id: string;
    email: string;
    name?: string | null;
  };
};

type LandingEditorDocument = {
  assets?: unknown[];
  components?: unknown;
  css?: string;
  customCss?: string;
  html?: string;
  layout?: LandingEditorLayout;
  placeholderValues?: PlaceholderValue;
  styles?: unknown;
  template?: {
    id: string;
    name: string;
    schema?: PlaceholderSchema | null;
  } | null;
  templateHtml?: string;
};

type LandingEditorDraftPayload = LandingEditorDocument & {
  device: "mobile" | "tablet" | "desktop";
  message?: string;
  source: "grapesjs" | "studio-sdk";
};

type LandingEditorDraftResponse = {
  id: string;
  createdAt: string;
  status: "DRAFT" | string;
  versionNum: number;
};

type LandingBulkArgs = {
  from?: string;
  to?: string;
  templateId?: string;
};

type LandingBulkRequest = {
  ids: string[];
  op: LandingBulkOperation;
  dryRun: boolean;
  args?: LandingBulkArgs;
};

type LandingBulkItemDiff = {
  id: string;
  name: string;
  before: {
    status: LandingStatus;
    templateId?: string | null;
    pixels?: unknown;
  };
  after: {
    status: LandingStatus;
    templateId?: string | null;
    pixels?: unknown;
  };
  changed: boolean;
};

type LandingBulkResponse = {
  dryRun: boolean;
  op: LandingBulkOperation;
  total: number;
  changed: number;
  items: LandingBulkItemDiff[];
};

type LandingPreviewTokenResponse = {
  expiresInSeconds: number;
  geo: string;
  slug: string;
  token: string;
};

type LandingApprovalSummary = {
  requireApprovals: number;
  roles: string[];
  approvedCount: number;
  pendingCount: number;
  readyToPublish: boolean;
};

type LandingNameAvailability = {
  name: string;
  available: boolean;
};

type LandingPublicIdSuggestion = {
  base: string;
  nextNumber: number;
  publicId: string;
};

type CreateLandingPayload = {
  name: string;
  slug: string;
  publicId: string;
  geoId: string;
  categoryId: string;
  variantId: string;
  templateId: string;
  status: Extract<LandingStatus, "DRAFT">;
};

type CreateLandingWizardPayloadInput = {
  name: string;
  geoId: string;
  publicId: string;
  template: TemplateOption;
  variantId: string;
};

const landingStatuses: LandingStatus[] = ["DRAFT", "IN_REVIEW", "PUBLISHED", "ARCHIVED"];

function serializeLandingListParams(filters: LandingListFilters) {
  return {
    category: filters.category || undefined,
    geo: filters.geo.length ? filters.geo.join(",") : undefined,
    limit: filters.limit,
    page: filters.page,
    search: filters.search?.trim() || undefined,
    status: filters.status || undefined,
    variant: filters.variant || undefined
  };
}

function getDuplicateGeoError(geoId: string | null | undefined) {
  return geoId ? null : "Select a GEO for the duplicated landing.";
}

function isValidPublicId(value: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

function buildCreateLandingPayload({
  geoId,
  name,
  publicId,
  template,
  variantId
}: CreateLandingWizardPayloadInput): CreateLandingPayload {
  const categoryId = template.category?.id ?? template.categoryId;

  if (!categoryId) {
    throw new Error("Selected template must have a category.");
  }

  return {
    categoryId,
    geoId,
    name: name.trim(),
    publicId,
    slug: publicId,
    status: "DRAFT",
    templateId: template.id,
    variantId
  };
}

async function fetchLandings(filters: LandingListFilters) {
  const response = await apiClient.get<ListResponse<LandingRow>>("/landings", {
    params: serializeLandingListParams(filters)
  });

  return response.data;
}

async function fetchGeoOptions() {
  const response = await apiClient.get<ListResponse<GeoOption>>("/geos", {
    params: { isActive: true, limit: 100 }
  });

  return response.data.items;
}

async function fetchCategoryOptions() {
  const response = await apiClient.get<ListResponse<CategoryOption>>("/categories", {
    params: { isActive: true, limit: 100 }
  });

  return response.data.items;
}

async function fetchVariantOptions() {
  const response = await apiClient.get<ListResponse<VariantOption>>("/variants", {
    params: { isActive: true, limit: 100 }
  });

  return response.data.items;
}

async function fetchCreateTemplates(geoId: string) {
  const response = await apiClient.get<ListResponse<TemplateOption>>("/templates", {
    params: {
      geoId,
      isActive: true,
      isPublic: true,
      limit: 100
    }
  });

  return response.data.items;
}

async function fetchLandingNameAvailability(name: string) {
  const response = await apiClient.get<LandingNameAvailability>(
    "/landings/name-availability",
    { params: { name } }
  );

  return response.data;
}

async function fetchLandingPublicIdSuggestion({
  categoryId,
  geoId,
  variantId
}: {
  categoryId: string;
  geoId: string;
  variantId: string;
}) {
  const response = await apiClient.get<LandingPublicIdSuggestion>(
    "/landings/public-id-suggestion",
    {
      params: {
        categoryId,
        geoId,
        variantId
      }
    }
  );

  return response.data;
}

async function createLanding(payload: CreateLandingPayload) {
  const response = await apiClient.post<LandingRow>("/landings", payload);

  return response.data;
}

async function fetchLanding(landingId: string) {
  const response = await apiClient.get<LandingDetail>(`/landings/${landingId}`);

  return response.data;
}

async function updateLanding(landingId: string, payload: Partial<CreateLandingPayload>) {
  const response = await apiClient.patch<LandingDetail>(
    `/landings/${landingId}`,
    payload
  );

  return response.data;
}

async function fetchLandingVersions(landingId: string) {
  const response = await apiClient.get<LandingVersion[]>(
    `/landings/${landingId}/versions`
  );

  return response.data;
}

async function fetchLandingEditorDocument(landingId: string) {
  const response = await apiClient.get<LandingEditorDocument>(
    `/landings/${landingId}/editor`
  );

  return response.data;
}

async function saveLandingDraftVersion(
  landingId: string,
  payload: LandingEditorDraftPayload
) {
  const response = await apiClient.post<LandingEditorDraftResponse>(
    `/landings/${landingId}/versions/draft`,
    payload
  );

  return response.data;
}

async function publishLandingDraft(landingId: string) {
  const response = await apiClient.post<{ id: string; status: string }>(
    `/landings/${landingId}/publish`
  );

  return response.data;
}

async function getPublishJob(landingId: string, jobId: string) {
  const response = await apiClient.get<{
    id: string;
    status: string;
    error?: string;
    logs?: string;
    resultUrl?: string;
  }>(`/landings/${landingId}/publish/${jobId}`);

  return response.data;
}

async function buildPreview(landingId: string) {
  const response = await apiClient.post<{ html: string }>(
    `/landings/${landingId}/build-preview`
  );

  return response.data;
}

async function createLandingPreviewToken(landingId: string) {
  const response = await apiClient.post<LandingPreviewTokenResponse>(
    `/landings/${landingId}/preview-token`
  );

  return response.data;
}

async function fetchLandingApprovalSummary(landingId: string) {
  const response = await apiClient.get<LandingApprovalSummary>(
    `/landings/${landingId}/approval-summary`
  );

  return response.data;
}

async function submitLandingForApproval(landingId: string) {
  const response = await apiClient.post(`/landings/${landingId}/submit`);

  return response.data;
}

async function approveLandingForPublish(landingId: string, note?: string) {
  const response = await apiClient.post(`/landings/${landingId}/approve`, { note });

  return response.data;
}

async function rejectLandingForPublish(landingId: string, note?: string) {
  const response = await apiClient.post(`/landings/${landingId}/reject`, { note });

  return response.data;
}

async function duplicateLanding(landingId: string, geoId: string) {
  const response = await apiClient.post<LandingRow>(`/landings/${landingId}/duplicate`, {
    geoId
  });

  return response.data;
}

async function deleteLanding(landingId: string) {
  const response = await apiClient.delete<LandingRow>(`/landings/${landingId}`);

  return response.data;
}

async function bulkDeleteLandings(ids: string[]) {
  const response = await apiClient.post<{ count: number }>("/landings/bulk/delete", {
    ids
  });

  return response.data;
}

async function bulkUpdateLandingStatus(ids: string[], status: LandingStatus) {
  const response = await apiClient.patch<{ count: number }>("/landings/bulk/status", {
    ids,
    status
  });

  return response.data;
}

async function runLandingBulkOperation(payload: LandingBulkRequest) {
  const response = await apiClient.post<LandingBulkResponse>("/landings/bulk", payload);

  return response.data;
}

async function acquireLandingLock(landingId: string, ttlMinutes: number = 15) {
  const response = await apiClient.post(`/landings/${landingId}/lock`, {
    ttlMinutes
  });

  return response.data;
}

async function refreshLandingLock(landingId: string) {
  const response = await apiClient.post<{ success: boolean; ttl: number }>(
    `/landings/${landingId}/lock/heartbeat`
  );

  return response.data;
}

async function releaseLandingLock(landingId: string) {
  const response = await apiClient.post(`/landings/${landingId}/unlock`);

  return response.data;
}

export {
  acquireLandingLock,
  approveLandingForPublish,
  buildCreateLandingPayload,
  buildPreview,
  bulkDeleteLandings,
  bulkUpdateLandingStatus,
  createLanding,
  createLandingPreviewToken,
  deleteLanding,
  duplicateLanding,
  fetchLanding,
  fetchCategoryOptions,
  fetchCreateTemplates,
  fetchGeoOptions,
  fetchLandingEditorDocument,
  fetchLandingApprovalSummary,
  fetchLandingNameAvailability,
  fetchLandingPublicIdSuggestion,
  fetchLandings,
  fetchLandingVersions,
  fetchVariantOptions,
  getDuplicateGeoError,
  getPublishJob,
  isValidPublicId,
  landingStatuses,
  publishLandingDraft,
  rejectLandingForPublish,
  runLandingBulkOperation,
  refreshLandingLock,
  releaseLandingLock,
  submitLandingForApproval,
  saveLandingDraftVersion,
  serializeLandingListParams,
  updateLanding
};
export type {
  CategoryOption,
  CreateLandingPayload,
  GeoOption,
  LandingDetail,
  LandingEditorDocument,
  LandingEditorDraftPayload,
  LandingEditorDraftResponse,
  LandingNameAvailability,
  LandingListFilters,
  LandingPublicIdSuggestion,
  LandingPreviewTokenResponse,
  LandingRow,
  LandingStatus,
  LandingApprovalSummary,
  LandingBulkItemDiff,
  LandingBulkOperation,
  LandingBulkRequest,
  LandingBulkResponse,
  LandingVersion,
  ListResponse,
  TemplateOption,
  VariantOption
};

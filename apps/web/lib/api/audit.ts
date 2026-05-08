import { apiClient } from "./client";

type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "RESTORE"
  | "PUBLISH"
  | "UNPUBLISH"
  | "DUPLICATE"
  | "LOGIN"
  | "LOGOUT"
  | "IMPORT"
  | "EXPORT";

type AuditLogEntry = {
  id: string;
  action: AuditAction;
  entity: string;
  entityId: string;
  userId: string | null;
  user: {
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
  } | null;
  diff: unknown;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
};

type AuditLogFilters = {
  page?: number;
  limit?: number;
  action?: AuditAction;
  entity?: string;
  entityId?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
};

type ListResponse<T> = {
  items: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    pageCount: number;
  };
};

async function fetchAuditLogs(filters: AuditLogFilters = {}) {
  const params = new URLSearchParams();

  if (filters.page) params.append("page", String(filters.page));
  if (filters.limit) params.append("limit", String(filters.limit));
  if (filters.action) params.append("action", filters.action);
  if (filters.entity) params.append("entity", filters.entity);
  if (filters.entityId) params.append("entityId", filters.entityId);
  if (filters.userId) params.append("userId", filters.userId);
  if (filters.startDate) params.append("startDate", filters.startDate);
  if (filters.endDate) params.append("endDate", filters.endDate);

  const response = await apiClient.get<ListResponse<AuditLogEntry>>(
    `/audit?${params.toString()}`
  );

  return response.data;
}

async function fetchLandingAuditLogs(landingId: string, filters: AuditLogFilters = {}) {
  const params = new URLSearchParams();

  if (filters.page) params.append("page", String(filters.page));
  if (filters.limit) params.append("limit", String(filters.limit));
  if (filters.action) params.append("action", filters.action);
  if (filters.userId) params.append("userId", filters.userId);
  if (filters.startDate) params.append("startDate", filters.startDate);
  if (filters.endDate) params.append("endDate", filters.endDate);

  const response = await apiClient.get<ListResponse<AuditLogEntry>>(
    `/audit/landings/${landingId}?${params.toString()}`
  );

  return response.data;
}

export { fetchAuditLogs, fetchLandingAuditLogs };
export type { AuditAction, AuditLogEntry, AuditLogFilters, ListResponse };

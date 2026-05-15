/** Prisma `WidgetType` — interactive widget implementation strategy. */
export type DashboardWidgetType = "REACT" | "VANILLA_JS" | "IFRAME" | "WEB_COMPONENT";

/** Prisma `WidgetStatus`. */
export type DashboardWidgetStatus = "DRAFT" | "PUBLISHED" | "DEPRECATED";

export interface WidgetVersionSummary {
  id: string;
  widgetId?: string;
  version: string;
  bundleUrl: string;
  bundleHash: string;
  schema: unknown;
  changelog?: string | null;
  isLatest: boolean;
  createdAt: string;
}

export interface WidgetAuthorSummary {
  id: string;
  email: string | null;
  name: string | null;
}

/** Single widget row from `GET /widgets` (Prisma shape). */
export interface WidgetLibraryListItem {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  type: DashboardWidgetType;
  status: DashboardWidgetStatus;
  category?: string | null;
  thumbnailUrl?: string | null;
  previewUrl?: string | null;
  tags: string[];
  authorId?: string | null;
  createdAt: string;
  updatedAt: string;
  versions: WidgetVersionSummary[];
}

export interface WidgetLibraryDetail extends WidgetLibraryListItem {
  author?: WidgetAuthorSummary | null;
}

export interface WidgetsListApiResponse {
  items: WidgetLibraryListItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    pageCount: number;
  };
}

export interface WidgetsQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: DashboardWidgetStatus;
  type?: DashboardWidgetType;
  category?: string;
  tag?: string;
}

export interface CreateWidgetDto {
  slug: string;
  name: string;
  description?: string;
  type?: DashboardWidgetType;
  status?: DashboardWidgetStatus;
  category?: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  tags?: string[];
}

export type UpdateWidgetDto = Partial<CreateWidgetDto>;

export interface CreateWidgetVersionDto {
  version: string;
  bundleUrl: string;
  bundleHash: string;
  schema: unknown;
  changelog?: string;
  isLatest?: boolean;
}

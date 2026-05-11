export interface ComponentCategory {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  description?: string;
  sortOrder: number;
}

export interface ComponentListItem {
  id: string;
  slug: string;
  name: string;
  description?: string;
  html: string;
  previewBg?: string;
  previewDark: boolean;
  previewHeight: number;
  category: ComponentCategory;
  tags: string[];
  isPinned: boolean;
  variantsCount: number;
  usageCount: number;
  updatedAt: string;
}

export interface ComponentDetail extends ComponentListItem {
  html: string;
  css?: string;
  variants: ComponentVariant[];
}

export interface ComponentVariant {
  id: string;
  name: string;
  html: string;
  css?: string;
  sortOrder: number;
  isDefault: boolean;
}

export interface ComponentsQueryParams {
  categoryId?: string;
  tags?: string[];
  search?: string;
  isPinned?: boolean;
  isPublic?: boolean;
  page?: number;
  limit?: number;
  sortBy?: "updatedAt" | "usageCount" | "name" | "createdAt";
  sortDir?: "asc" | "desc";
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateComponentDto {
  name: string;
  slug: string;
  description?: string;
  html: string;
  css?: string;
  previewBg?: string;
  previewDark?: boolean;
  previewHeight?: number;
  categoryId: string;
  tags?: string[];
  isPinned?: boolean;
  isPublic?: boolean;
}

export type UpdateComponentDto = Partial<CreateComponentDto>;

export interface CreateVariantDto {
  name: string;
  html: string;
  css?: string;
  isDefault?: boolean;
}

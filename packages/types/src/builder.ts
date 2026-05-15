export type BuilderPageStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type BuilderVersionStatus = "AUTOSAVE" | "MANUAL" | "PUBLISHED";

export interface BuilderEditorDocument {
  assets?: unknown[];
  components?: unknown;
  css?: string;
  design?: unknown;
  device?: "mobile" | "tablet" | "desktop";
  html?: string;
  styles?: unknown;
}

export interface BuilderPageSummary {
  id: string;
  name: string;
  status: BuilderPageStatus;
  updatedAt: string;
  createdAt: string;
}

export interface BuilderPageDetail extends BuilderPageSummary, BuilderEditorDocument {
  currentVersionId?: string | null;
}

export interface BuilderPageVersion {
  id: string;
  versionNum: number;
  status: BuilderVersionStatus;
  message?: string | null;
  createdAt: string;
  author?: {
    id: string;
    email: string;
    name?: string | null;
  };
}

export interface CreateBuilderPageDto {
  name?: string;
}

export interface UpdateBuilderPageDto {
  name?: string;
  status?: BuilderPageStatus;
}

export interface SaveBuilderDraftDto extends BuilderEditorDocument {
  message?: string;
}

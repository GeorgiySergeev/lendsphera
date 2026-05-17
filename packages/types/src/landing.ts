import type { I18nDict } from "./i18n";

export type SeoMeta = {
  title?: string;
  description?: string;
  ogImage?: string;
  canonical?: string;
};

export type LandingStatus = "DRAFT" | "IN_REVIEW" | "PUBLISHED" | "ARCHIVED";

export type LegacySource = "UPLOAD" | "GIT_REPO" | "FTP" | "S3_IMPORT" | "ZIP";

export type LandingContext = {
  landingId: string;
  slug: string;
  geoId: string;
  lang: string;
  dir: "ltr" | "rtl";
  productId: string | null;
  productName: string | null;
  productImage: string | null;
  price: string | null;
  oldPrice: string | null;
  currency: string | null;
  discount: string | null;
  templateId: string | null;
  placeholders: Record<string, string>;
  i18n: I18nDict;
  pixels: Record<string, string> | null;
  postbacks: Record<string, string> | null;
  seoMeta: SeoMeta | null;
  settings: Record<string, unknown>;
  versionId: string | null;
  resolvedAt: string;
};

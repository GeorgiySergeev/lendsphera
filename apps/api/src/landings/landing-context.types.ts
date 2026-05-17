import type { LandingContext } from "@workspace/types";

export type StringMap = Record<string, string>;

export type LandingContextResolveInput = {
  landingId: string;
  at?: Date;
};

export type LandingI18nLayerConfig = {
  keys?: string[];
};

export type LandingContextLayerConfig = {
  global?: unknown;
  geo?: unknown;
  product?: unknown;
  landing?: {
    overrides?: unknown;
  };
  i18n?: LandingI18nLayerConfig;
};

export type PriceView = {
  currency: string | null;
  discount: string | null;
  oldPrice: string | null;
  price: string | null;
};

export type LandingI18nRow = {
  key: string;
  lang: string;
  value: string;
};

export type LandingResolverOutput = LandingContext;

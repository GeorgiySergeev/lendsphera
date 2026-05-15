/**
 * One element of `utils/locales.json` — shape is stable across the file;
 * extra keys are allowed for forward compatibility.
 */
export type LocaleCatalogEntry = {
  locale: string;
  language: Record<string, unknown>;
  country: Record<string, unknown>;
};

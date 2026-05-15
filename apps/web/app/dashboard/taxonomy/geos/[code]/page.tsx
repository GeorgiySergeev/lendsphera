import { GeoLocaleCountryDetail } from "../../../../../components/dashboard/taxonomy/geo-locale-country-detail";
import type { LocaleCatalogEntry } from "../../../../../types/locale-catalog";
import allLocalesRaw from "../../../../../utils/locales.json";

function isLocaleCatalogEntry(value: unknown): value is LocaleCatalogEntry {
  if (!value || typeof value !== "object") {
    return false;
  }

  const row = value as Record<string, unknown>;

  return (
    typeof row.locale === "string" &&
    typeof row.language === "object" &&
    row.language !== null &&
    typeof row.country === "object" &&
    row.country !== null
  );
}

export default async function GeoLocaleCountryPage({
  params
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const normalized = code.trim().toUpperCase();

  const allRows = Array.isArray(allLocalesRaw)
    ? allLocalesRaw.filter(isLocaleCatalogEntry)
    : [];

  const localeEntries = allRows.filter((row) => {
    const c = row.country["code"];
    return typeof c === "string" && c.trim().toUpperCase() === normalized;
  });

  return (
    <GeoLocaleCountryDetail countryCode={normalized} localeEntries={localeEntries} />
  );
}

import { Injectable, NotFoundException } from "@nestjs/common";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { getPagination, listResponse } from "../common/pagination";
import { PrismaService } from "../prisma/prisma.service";
import type {
  GeoLocaleCountryDetail,
  GeoLocaleFileEntry,
  GeoLocaleListItem
} from "./geo-locales.types";
import type { GeoLocalesListQueryDto } from "./geos.dto";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeLocaleEntry(raw: unknown): GeoLocaleFileEntry | null {
  if (!isRecord(raw)) {
    return null;
  }

  const locale = raw.locale;
  const language = raw.language;
  const country = raw.country;

  if (typeof locale !== "string" || !isRecord(language) || !isRecord(country)) {
    return null;
  }

  const countryCode = country.code;
  const countryNameLocal = country.name_local;
  const continent = country.continent;
  const region = country.region;
  const countryName = country.name;
  const flag = country.flag;

  if (
    typeof countryCode !== "string" ||
    typeof countryNameLocal !== "string" ||
    typeof continent !== "string" ||
    typeof region !== "string"
  ) {
    return null;
  }

  const iso = language.iso_639_1;
  const langName = language.name;
  const langNameLocal = language.name_local;

  if (
    typeof iso !== "string" ||
    typeof langName !== "string" ||
    typeof langNameLocal !== "string"
  ) {
    return null;
  }

  return {
    country: {
      code: countryCode,
      continent,
      flag: typeof flag === "string" ? flag : undefined,
      name: typeof countryName === "string" ? countryName : countryNameLocal,
      name_local: countryNameLocal,
      region
    },
    language: {
      countries: Array.isArray(language.countries)
        ? (language.countries as unknown[])
            .filter(isRecord)
            .map((c) => ({
              code: typeof c.code === "string" ? c.code : "",
              name: typeof c.name === "string" ? c.name : "",
              name_local: typeof c.name_local === "string" ? c.name_local : ""
            }))
            .filter((c) => c.code)
        : undefined,
      iso_639_1: iso,
      iso_639_2: typeof language.iso_639_2 === "string" ? language.iso_639_2 : undefined,
      iso_639_3: typeof language.iso_639_3 === "string" ? language.iso_639_3 : undefined,
      name: langName,
      name_local: langNameLocal
    },
    locale
  };
}

@Injectable()
export class GeoLocalesService {
  private parsed: GeoLocaleFileEntry[] | null = null;

  constructor(private readonly prisma: PrismaService) {}

  private loadFile(): GeoLocaleFileEntry[] {
    if (this.parsed) {
      return this.parsed;
    }

    const path = this.resolveLocalesPath();
    const raw = JSON.parse(readFileSync(path, "utf8")) as unknown;

    if (!Array.isArray(raw)) {
      throw new Error("Geo locales file must be a JSON array.");
    }

    const entries: GeoLocaleFileEntry[] = [];

    for (const item of raw) {
      const normalized = normalizeLocaleEntry(item);

      if (normalized) {
        entries.push(normalized);
      }
    }

    this.parsed = entries;
    return entries;
  }

  private resolveLocalesPath(): string {
    const candidates = [
      join(__dirname, "locales.json"),
      join(process.cwd(), "src", "geos", "locales.json"),
      join(process.cwd(), "apps", "api", "src", "geos", "locales.json")
    ];

    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        return candidate;
      }
    }

    throw new Error(
      "Geo locales file not found. Expected locales.json next to the bundle or under apps/api/src/geos/."
    );
  }

  private async catalogByCountryCode(): Promise<
    Map<string, { id: string; landingCount: number }>
  > {
    const rows = await this.prisma.geo.findMany({
      select: {
        id: true,
        code: true,
        _count: { select: { landings: true } }
      }
    });
    const map = new Map<string, { id: string; landingCount: number }>();

    for (const row of rows) {
      map.set(row.code.trim().toUpperCase(), {
        id: row.id,
        landingCount: row._count.landings
      });
    }

    return map;
  }

  private toListItem(
    entry: GeoLocaleFileEntry,
    catalog: Map<string, { id: string; landingCount: number }>
  ): GeoLocaleListItem {
    const countryCode = entry.country.code.trim().toUpperCase();
    const cat = catalog.get(countryCode);

    return {
      continent: entry.country.continent,
      countryCode,
      countryNameLocal: entry.country.name_local,
      landingCount: cat?.landingCount ?? 0,
      languageCode: entry.language.iso_639_1.trim(),
      locale: entry.locale,
      catalogGeoId: cat?.id ?? null,
      region: entry.country.region
    };
  }

  async listLocales(query: GeoLocalesListQueryDto) {
    const entries = this.loadFile();
    const { skip, take, page, limit } = getPagination(query);
    const catalog = await this.catalogByCountryCode();
    const slice = entries.slice(skip, skip + take);
    const items = slice.map((e) => this.toListItem(e, catalog));

    return listResponse(items, entries.length, page, limit);
  }

  async getCountryCatalogMeta(countryCode: string): Promise<{
    catalogGeoId: string | null;
    countryCode: string;
    landingCount: number;
  }> {
    const code = countryCode.trim().toUpperCase();

    if (!/^[A-Z]{2}$/.test(code)) {
      throw new NotFoundException("Invalid country code.");
    }

    const catalog = await this.catalogByCountryCode();
    const cat = catalog.get(code);

    return {
      catalogGeoId: cat?.id ?? null,
      countryCode: code,
      landingCount: cat?.landingCount ?? 0
    };
  }

  async getCountryLocales(countryCode: string): Promise<GeoLocaleCountryDetail> {
    const code = countryCode.trim().toUpperCase();

    if (!/^[A-Z]{2}$/.test(code)) {
      throw new NotFoundException("Invalid country code.");
    }

    const entries = this.loadFile().filter(
      (e) => e.country.code.trim().toUpperCase() === code
    );

    if (!entries.length) {
      throw new NotFoundException(`No locale entries for country code ${code}.`);
    }

    const catalog = await this.catalogByCountryCode();
    const cat = catalog.get(code);

    return {
      catalogGeoId: cat?.id ?? null,
      country: entries[0]!.country,
      countryCode: code,
      landingCount: cat?.landingCount ?? 0,
      locales: entries
    };
  }
}

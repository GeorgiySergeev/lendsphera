/** One row from `locales.json` (locale + country + primary language). */
export type GeoLocaleFileEntry = {
  locale: string;
  language: {
    name: string;
    name_local: string;
    iso_639_1: string;
    iso_639_2?: string;
    iso_639_3?: string;
    countries?: Array<{ name: string; name_local: string; code: string }>;
  };
  country: {
    name: string;
    name_local: string;
    code: string;
    continent: string;
    region: string;
    flag?: string;
  };
};

export type GeoLocaleListItem = {
  locale: string;
  countryCode: string;
  countryNameLocal: string;
  languageCode: string;
  continent: string;
  region: string;
  catalogGeoId: string | null;
  landingCount: number;
};

export type GeoLocaleCountryDetail = {
  countryCode: string;
  country: GeoLocaleFileEntry["country"];
  locales: GeoLocaleFileEntry[];
  catalogGeoId: string | null;
  landingCount: number;
};

import { describe, expect, it } from "vitest";

import {
  buildCreateLandingPayload,
  getDuplicateGeoError,
  isValidPublicId,
  serializeLandingListParams,
  type LandingListFilters
} from "./landings";

describe("landings API helpers", () => {
  it("serializes table filters into API query params", () => {
    const filters: LandingListFilters = {
      category: "casino",
      geo: ["US", "DE"],
      limit: 20,
      page: 2,
      search: " spring ",
      status: "PUBLISHED",
      variant: "long-form"
    };

    expect(serializeLandingListParams(filters)).toEqual({
      category: "casino",
      geo: "US,DE",
      limit: 20,
      page: 2,
      search: "spring",
      status: "PUBLISHED",
      variant: "long-form"
    });
  });

  it("omits empty filter params", () => {
    expect(
      serializeLandingListParams({
        geo: [],
        limit: 20,
        page: 1,
        search: ""
      })
    ).toEqual({
      category: undefined,
      geo: undefined,
      limit: 20,
      page: 1,
      search: undefined,
      status: undefined,
      variant: undefined
    });
  });

  it("requires a GEO before duplicate submit", () => {
    expect(getDuplicateGeoError("geo_1")).toBeNull();
    expect(getDuplicateGeoError("")).toBe("Select a GEO for the duplicated landing.");
  });

  it("builds create payload from template category and wizard values", () => {
    expect(
      buildCreateLandingPayload({
        geoId: "geo_us",
        name: " Spring Campaign ",
        publicId: "us-diabetes-form-1",
        template: {
          category: {
            id: "category_1",
            name: "Diabetes",
            slug: "diabetes"
          },
          id: "template_1",
          name: "News",
          slug: "news"
        },
        variantId: "variant_1"
      })
    ).toEqual({
      categoryId: "category_1",
      geoId: "geo_us",
      name: "Spring Campaign",
      publicId: "us-diabetes-form-1",
      slug: "us-diabetes-form-1",
      status: "DRAFT",
      templateId: "template_1",
      variantId: "variant_1"
    });
  });

  it("validates editable public IDs as lowercase slug values", () => {
    expect(isValidPublicId("us-diabetes-form-1")).toBe(true);
    expect(isValidPublicId("US Diabetes")).toBe(false);
    expect(isValidPublicId("us--diabetes")).toBe(false);
  });
});

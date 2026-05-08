import { AxiosError, AxiosHeaders } from "axios";
import { describe, expect, it } from "vitest";

import {
  getDeleteConflictMessage,
  getLandingConflictCount,
  serializeTaxonomyListParams
} from "./taxonomy";

describe("taxonomy API helpers", () => {
  it("serializes list filters", () => {
    expect(
      serializeTaxonomyListParams({
        limit: 50,
        page: 2,
        search: " health "
      })
    ).toEqual({
      limit: 50,
      page: 2,
      search: "health"
    });
  });

  it("uses dense taxonomy list defaults", () => {
    expect(serializeTaxonomyListParams()).toEqual({
      limit: 100,
      page: 1,
      search: undefined
    });
  });

  it("formats delete conflicts with landing counts", () => {
    const error = new AxiosError("Conflict", "409", undefined, undefined, {
      config: { headers: new AxiosHeaders() },
      data: { landingCount: 3 },
      headers: new AxiosHeaders(),
      status: 409,
      statusText: "Conflict"
    });

    expect(getLandingConflictCount(error)).toBe(3);
    expect(getDeleteConflictMessage("Category", error)).toBe(
      "Category is used by 3 active landings. Remove or reassign those landings first."
    );
  });
});

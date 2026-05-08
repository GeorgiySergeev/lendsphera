import { describe, expect, it } from "vitest";

import { HealthController } from "./health.controller";

describe("HealthController", () => {
  it("returns a typed health response", () => {
    const response = new HealthController().health();

    expect(response.status).toBe("ok");
    expect(response.service).toBe("api");
    expect(new Date(response.timestamp).toString()).not.toBe("Invalid Date");
  });
});

import { describe, expect, it } from "vitest";

import { createLandingStepFields, createLandingWizardSchema } from "./create-wizard";

describe("create landing wizard schema", () => {
  it("accepts complete wizard values", () => {
    expect(
      createLandingWizardSchema.safeParse({
        geoId: "geo_us",
        name: "Spring Campaign",
        publicId: "us-diabetes-form-1",
        templateId: "template_1",
        variantId: "variant_1"
      }).success
    ).toBe(true);
  });

  it("rejects invalid public IDs", () => {
    const result = createLandingWizardSchema.safeParse({
      geoId: "geo_us",
      name: "Spring Campaign",
      publicId: "US Diabetes",
      templateId: "template_1",
      variantId: "variant_1"
    });

    expect(result.success).toBe(false);
  });

  it("keeps the wizard as five decision steps", () => {
    expect(createLandingStepFields).toEqual([
      ["name"],
      ["geoId"],
      ["templateId"],
      ["variantId"],
      ["publicId"]
    ]);
  });
});

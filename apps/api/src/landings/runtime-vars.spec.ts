import { describe, expect, it, vi } from "vitest";

process.env.JWT_ACCESS_SECRET = "test-access-secret-1234567890123456";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-123456789012345";
process.env.LS_BRIDGE_KEY = "test-bridge-key-123456";
process.env.LS_BRIDGE_HMAC_SECRET = "test-bridge-hmac-secret-123456";

describe("Runtime vars", () => {
  it("formats all numeric values as locale strings for DE", async () => {
    const { RuntimeVarsService } = await import("./runtime-vars.service");
    const resolver = {
      resolve: vi.fn().mockResolvedValue({
        currency: "EUR",
        discount: "12",
        geoId: "geo_de",
        i18n: {},
        lang: "de",
        landingId: "landing_1",
        placeholders: { CTA: "Jetzt bestellen" },
        pixels: null,
        postbacks: null,
        price: "39",
        productId: "product_1",
        productImage: null,
        productName: "X",
        resolvedAt: new Date().toISOString(),
        seoMeta: null,
        settings: {},
        slug: "landing-de",
        templateId: null,
        versionId: "v1",
        oldPrice: "55"
      })
    };
    const service = new RuntimeVarsService(resolver as never);

    const result = await service.getByLandingId("landing_1");

    expect(result.payload.vars.LS_PRICE).toBe("39,00");
    expect(result.payload.vars.LS_OLD_PRICE).toBe("55,00");
    expect(result.payload.vars.LS_DISCOUNT).toBe("12");
    expect(result.payload.signature).toMatch(/^[a-f0-9]{64}$/);
    expect(result.etag).toMatch(/^"[a-f0-9]{64}"$/);
  });

  it("formats all numeric values as locale strings for US", async () => {
    const { RuntimeVarsService } = await import("./runtime-vars.service");
    const resolver = {
      resolve: vi.fn().mockResolvedValue({
        currency: "USD",
        discount: null,
        geoId: "geo_us",
        i18n: {},
        lang: "en",
        landingId: "landing_1",
        placeholders: {},
        pixels: null,
        postbacks: null,
        price: "39",
        productId: "product_1",
        productImage: null,
        productName: "X",
        resolvedAt: new Date().toISOString(),
        seoMeta: null,
        settings: {},
        slug: "landing-us",
        templateId: null,
        versionId: "v1",
        oldPrice: "55"
      })
    };
    const service = new RuntimeVarsService(resolver as never);

    const result = await service.getByLandingId("landing_1");

    expect(result.payload.vars.LS_PRICE).toBe("39.00");
    expect(result.payload.vars.LS_OLD_PRICE).toBe("55.00");
  });

  it("rejects invalid bridge key", async () => {
    const { RuntimeVarsGuard } = await import("./runtime-vars.guard");
    const { UnauthorizedException } = await import("@nestjs/common");
    const guard = new RuntimeVarsGuard();
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: {} })
      })
    };

    expect(() => guard.canActivate(context as never)).toThrow(UnauthorizedException);
  });

  it("accepts valid bridge key", async () => {
    const { RuntimeVarsGuard } = await import("./runtime-vars.guard");
    const { env } = await import("../config/env");
    const guard = new RuntimeVarsGuard();
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: { "x-ls-bridge-key": env.LS_BRIDGE_KEY } })
      })
    };

    expect(guard.canActivate(context as never)).toBe(true);
  });

  it("returns 304 when If-None-Match matches ETag", async () => {
    const { RuntimeVarsController } = await import("./runtime-vars.controller");
    const payload = {
      cachedUntil: new Date().toISOString(),
      generatedAt: new Date().toISOString(),
      landingId: "landing_1",
      signature: "sig",
      vars: {
        LS_CTA: "",
        LS_CURRENCY: "",
        LS_DISCLAIMER: "",
        LS_DISCOUNT: "",
        LS_OLD_PRICE: "",
        LS_PIXEL_ID: "",
        LS_POSTBACK_URL: "",
        LS_PRICE: "",
        LS_PRODUCT_IMAGE: "",
        LS_PRODUCT_NAME: ""
      },
      versionId: "v1"
    };
    const service = {
      getByLandingId: vi.fn().mockResolvedValue({ etag: '"etag-1"', payload })
    };
    const controller = new RuntimeVarsController(service as never);
    const request = { header: vi.fn().mockReturnValue('"etag-1"') };
    const response = {
      json: vi.fn(),
      send: vi.fn(),
      setHeader: vi.fn(),
      status: vi.fn().mockReturnThis()
    };

    await controller.byLandingId("landing_1", request as never, response as never);

    expect(response.setHeader).toHaveBeenCalledWith("ETag", '"etag-1"');
    expect(response.status).toHaveBeenCalledWith(304);
    expect(response.send).toHaveBeenCalled();
    expect(response.json).not.toHaveBeenCalled();
  });
});

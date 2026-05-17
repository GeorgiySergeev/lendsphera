import { createHmac } from "node:crypto";

import { expect, test } from "@playwright/test";

const runtimeOrigin = process.env.RUNTIME_ORIGIN_E2E || "http://127.0.0.1:3001";
const sharedSecret =
  process.env.LS_BRIDGE_HMAC_SECRET || "dev-ls-bridge-hmac-secret-change-me";

function buildPayload() {
  return {
    landingId: "landing-e2e-revalidation",
    geo: "de",
    slug: "urology",
    reason: "landing.invalidated" as const
  };
}

test.describe("ISR revalidation webhook", () => {
  test("rejects forged webhook signatures with 401", async ({ request }) => {
    const response = await request.post(`${runtimeOrigin}/api/revalidate`, {
      headers: {
        "content-type": "application/json",
        "x-ls-signature": "forged-signature"
      },
      data: buildPayload()
    });

    expect(response.status()).toBe(401);
  });

  test("accepts valid signatures and revalidates the exact path", async ({ request }) => {
    const payload = buildPayload();
    const serialized = JSON.stringify(payload);
    const signature = createHmac("sha256", sharedSecret).update(serialized).digest("hex");

    const response = await request.post(`${runtimeOrigin}/api/revalidate`, {
      headers: {
        "content-type": "application/json",
        "x-ls-signature": signature
      },
      data: serialized
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: true,
      revalidated: `/${payload.geo}/${payload.slug}`,
      reason: payload.reason,
      landingId: payload.landingId
    });
  });
});

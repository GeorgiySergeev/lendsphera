import { execFile, spawn, type ChildProcess } from "node:child_process";
import { promisify } from "node:util";

import type { APIRequestContext } from "@playwright/test";
import { expect, test } from "@playwright/test";

const execFileAsync = promisify(execFile);
const PNPM_RUNNER = process.platform === "win32" ? "cmd.exe" : "pnpm";

const COMPOSE_FILE = "docker-compose.test.yml";
const LEGACY_URL = "http://127.0.0.1:58080/de/urology/";
const API_URL = "http://127.0.0.1:54000/api";
const DB_URL =
  "postgresql://postgres:postgres@127.0.0.1:55432/landing_builder?schema=public";

const LANDING_ID = "landing_e2e_price";
const PRODUCT_ID = "product_e2e_price";
const VERSION_ID = "version_e2e_price";
const BASE_PRICE = "39.00";
const NEW_PRICE = "49.00";
let apiProcess: ChildProcess | null = null;

test.describe.configure({ mode: "serial" });

test.describe("legacy-bridge", () => {
  test.beforeAll(async () => {
    test.setTimeout(240_000);
    await compose(["up", "-d", "--build"]);
    await prepareApi();
    await startApi();
    await waitForReady();
    await seedFixtureData();
  });

  test.afterAll(async () => {
    if (apiProcess && !apiProcess.killed) {
      apiProcess.kill("SIGTERM");
      apiProcess = null;
    }
    await compose(["down", "-v", "--remove-orphans"]);
  });

  test("propagates CRM price changes to legacy HTML and back", async ({ request }) => {
    const initialHtml = await fetchLegacyHtml();
    expect(initialHtml).toContain("Price: 39,00 EUR");
    expect(initialHtml).toContain("Old: 59,00");

    const token = await loginAndGetToken(request);

    const firstSwitchFrom = new Date(Date.now() + 1000).toISOString();
    const firstResponse = await request.post(`${API_URL}/products/${PRODUCT_ID}/prices`, {
      headers: { authorization: `Bearer ${token}` },
      data: {
        geoCode: "DE",
        validFrom: firstSwitchFrom,
        price: NEW_PRICE,
        oldPrice: BASE_PRICE,
        currency: "EUR",
        notes: "e2e price propagation"
      }
    });
    expect(firstResponse.ok()).toBeTruthy();

    const switchedHtml = await pollLegacy(
      (html) => html.includes("Price: 49,00 EUR") && !html.includes("Price: 39,00 EUR"),
      10_000
    );
    expect(switchedHtml).toContain("Price: 49,00 EUR");
    expect(switchedHtml).not.toContain("Price: 39,00 EUR");

    const revertFrom = new Date(Date.now() + 1000).toISOString();
    const revertResponse = await request.post(
      `${API_URL}/products/${PRODUCT_ID}/prices`,
      {
        headers: { authorization: `Bearer ${token}` },
        data: {
          geoCode: "DE",
          validFrom: revertFrom,
          price: BASE_PRICE,
          oldPrice: NEW_PRICE,
          currency: "EUR",
          notes: "e2e revert"
        }
      }
    );
    expect(revertResponse.ok()).toBeTruthy();

    const revertedHtml = await pollLegacy(
      (html) => html.includes("Price: 39,00 EUR") && !html.includes("Price: 49,00 EUR"),
      10_000
    );
    expect(revertedHtml).toContain("Price: 39,00 EUR");
    expect(revertedHtml).not.toContain("Price: 49,00 EUR");
  });
});

async function compose(args: string[]) {
  await execFileAsync("docker", ["compose", "-f", COMPOSE_FILE, ...args], {
    windowsHide: true
  });
}

async function waitForReady() {
  const deadline = Date.now() + 240_000;
  while (Date.now() < deadline) {
    try {
      const [health, legacy] = await Promise.all([
        fetch(`${API_URL}/health`),
        fetch(LEGACY_URL)
      ]);
      if (health.ok && legacy.ok) {
        return;
      }
    } catch {
      // keep polling
    }
    await sleep(1000);
  }
  throw new Error("Timed out waiting for API + legacy services to become ready.");
}

async function prepareApi() {
  await execFileAsync(
    PNPM_RUNNER,
    process.platform === "win32"
      ? ["/c", "pnpm --filter @workspace/api exec prisma migrate deploy"]
      : ["--filter", "@workspace/api", "exec", "prisma", "migrate", "deploy"],
    {
      windowsHide: true,
      cwd: process.cwd(),
      env: {
        ...process.env,
        DATABASE_URL: DB_URL
      }
    }
  );

  await execFileAsync(
    PNPM_RUNNER,
    process.platform === "win32"
      ? ["/c", "pnpm --filter @workspace/api exec prisma db seed"]
      : ["--filter", "@workspace/api", "exec", "prisma", "db", "seed"],
    {
      windowsHide: true,
      cwd: process.cwd(),
      env: {
        ...process.env,
        DATABASE_URL: DB_URL
      }
    }
  );
}

async function startApi() {
  apiProcess = spawn(
    PNPM_RUNNER,
    process.platform === "win32"
      ? ["/c", "pnpm --filter @workspace/api dev"]
      : ["--filter", "@workspace/api", "dev"],
    {
      cwd: process.cwd(),
      windowsHide: true,
      env: {
        ...process.env,
        NODE_ENV: "test",
        PORT: "54000",
        DATABASE_URL: DB_URL,
        REDIS_URL: "redis://127.0.0.1:56379",
        JWT_ACCESS_SECRET: "12345678901234567890123456789012",
        JWT_REFRESH_SECRET: "12345678901234567890123456789013",
        COOKIE_SECRET: "1234567890abcdef",
        LS_BRIDGE_KEY: "dev-ls-bridge-key-change-me",
        LS_BRIDGE_HMAC_SECRET: "dev-ls-bridge-hmac-secret-change-me",
        S3_ENDPOINT: "http://127.0.0.1:9000",
        S3_REGION: "us-east-1",
        S3_BUCKET: "landing-assets",
        S3_ACCESS_KEY: "minioadmin",
        S3_SECRET_KEY: "minioadmin"
      },
      stdio: "pipe"
    }
  );

  apiProcess.stdout?.on("data", () => {});
  apiProcess.stderr?.on("data", () => {});
}

async function seedFixtureData() {
  const seedScript = `
  import { PrismaClient } from "@prisma/client";
  const prisma = new PrismaClient();
  const LANDING_ID = "${LANDING_ID}";
  const PRODUCT_ID = "${PRODUCT_ID}";
  const VERSION_ID = "${VERSION_ID}";

  const admin = await prisma.user.findUniqueOrThrow({ where: { email: "admin@example.com" } });
  const geo = await prisma.geo.findUniqueOrThrow({ where: { code: "DE" } });
  const category = await prisma.category.findFirstOrThrow();
  const variant = await prisma.variant.findFirstOrThrow();

  await prisma.product.upsert({
    where: { id: PRODUCT_ID },
    update: { name: "E2E Product", slug: "e2e-product", categoryId: category.id, archivedAt: null },
    create: { id: PRODUCT_ID, name: "E2E Product", slug: "e2e-product", categoryId: category.id }
  });

  await prisma.landing.upsert({
    where: { id: LANDING_ID },
    update: {
      publicId: "legacy-e2e-price",
      name: "Legacy E2E Price",
      slug: "urology-e2e-price",
      geoId: geo.id,
      categoryId: category.id,
      variantId: variant.id,
      ownerId: admin.id,
      status: "PUBLISHED",
      productId: PRODUCT_ID,
      origin: "WRAPPED_LEGACY",
      legacyRef: "lander/de/urology",
      settings: {},
      pixels: {},
      postbacks: {}
    },
    create: {
      id: LANDING_ID,
      publicId: "legacy-e2e-price",
      name: "Legacy E2E Price",
      slug: "urology-e2e-price",
      geoId: geo.id,
      categoryId: category.id,
      variantId: variant.id,
      ownerId: admin.id,
      status: "PUBLISHED",
      productId: PRODUCT_ID,
      origin: "WRAPPED_LEGACY",
      legacyRef: "lander/de/urology",
      settings: {},
      pixels: {},
      postbacks: {}
    }
  });

  await prisma.version.upsert({
    where: { id: VERSION_ID },
    update: { landingId: LANDING_ID, versionNum: 1, status: "PUBLISHED", grapesJson: {}, placeholders: {}, authorId: admin.id },
    create: { id: VERSION_ID, landingId: LANDING_ID, versionNum: 1, status: "PUBLISHED", grapesJson: {}, placeholders: {}, authorId: admin.id }
  });

  await prisma.landing.update({ where: { id: LANDING_ID }, data: { currentVersionId: VERSION_ID } });
  await prisma.price.deleteMany({ where: { productId: PRODUCT_ID } });
  await prisma.price.create({
    data: {
      productId: PRODUCT_ID,
      geoId: geo.id,
      validFrom: new Date(Date.now() - 60_000),
      price: "${BASE_PRICE}",
      oldPrice: "59.00",
      currency: "EUR",
      createdBy: admin.id,
      notes: "e2e base"
    }
  });

  await prisma.$disconnect();
  `;

  await execFileAsync(
    PNPM_RUNNER,
    process.platform === "win32"
      ? [
          "/c",
          `pnpm --filter @workspace/api exec tsx -e "${seedScript.replaceAll('"', '\\"')}"`
        ]
      : ["--filter", "@workspace/api", "exec", "tsx", "-e", seedScript],
    {
      windowsHide: true,
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: DB_URL }
    }
  );
}

async function loginAndGetToken(request: APIRequestContext): Promise<string> {
  const response = await request.post(`${API_URL}/auth/login`, {
    data: {
      email: "admin@example.com",
      password: "admin123"
    }
  });
  expect(response.ok()).toBeTruthy();

  const json = (await response.json()) as { accessToken: string };
  return json.accessToken;
}

async function fetchLegacyHtml() {
  const response = await fetch(LEGACY_URL);
  if (!response.ok) {
    throw new Error(`Legacy URL failed: ${response.status}`);
  }
  return response.text();
}

async function pollLegacy(predicate: (html: string) => boolean, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs;
  let lastHtml = "";

  while (Date.now() < deadline) {
    lastHtml = await fetchLegacyHtml();
    if (predicate(lastHtml)) {
      return lastHtml;
    }
    await sleep(500);
  }

  throw new Error(`Legacy HTML did not match in time. Last response:\n${lastHtml}`);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.BASE_URL || "http://localhost:3002";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",

  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure"
  },

  projects: [
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/
    },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
      testIgnore: /(legacy-bridge|revalidation|pricing-matrix)\.spec\.ts/
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
      dependencies: ["setup"],
      testIgnore: /(legacy-bridge|revalidation|pricing-matrix)\.spec\.ts/
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
      dependencies: ["setup"],
      testIgnore: /(legacy-bridge|revalidation|pricing-matrix)\.spec\.ts/
    },
    {
      name: "pricing-matrix",
      testMatch: /pricing-matrix\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] }
    },
    {
      name: "revalidation",
      testMatch: /revalidation\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] }
    },
    {
      name: "legacy-bridge",
      testMatch: /legacy-bridge\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        baseURL: process.env.LEGACY_BASE_URL || "http://127.0.0.1:58080"
      }
    }
  ],

  webServer: process.env.CI
    ? undefined
    : {
        command: "pnpm dev",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000
      }
});

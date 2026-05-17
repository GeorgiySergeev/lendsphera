import { defineConfig } from "@playwright/test";

export default defineConfig({
  use: {
    baseURL: process.env.LEGACY_BASE_URL || "http://127.0.0.1:58080"
  },
  projects: [
    {
      name: "legacy-bridge",
      testMatch: /legacy-bridge\.spec\.ts/
    }
  ]
});

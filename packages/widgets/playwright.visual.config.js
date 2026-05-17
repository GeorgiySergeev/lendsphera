import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/visual",
  fullyParallel: false,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:6006"
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ],
  webServer: {
    command: "pnpm --filter @workspace/widgets storybook",
    url: "http://127.0.0.1:6006",
    reuseExistingServer: true,
    timeout: 120000
  }
});

import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  "packages/*/vitest.config.ts",
  "apps/api/vitest.config.ts",
  "tools/legacy-bridge-php/deploy/vitest.config.ts"
]);

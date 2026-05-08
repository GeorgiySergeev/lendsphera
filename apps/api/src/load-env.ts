import { config } from "dotenv";
import { resolve } from "node:path";

// With `turbo dev` / `nest start`, cwd is `apps/api`. Load monorepo root first, then local overrides.
const cwd = process.cwd();
config({ path: resolve(cwd, "../../.env") });
config({ path: resolve(cwd, ".env"), override: true });

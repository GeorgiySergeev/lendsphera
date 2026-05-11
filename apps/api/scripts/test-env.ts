/**
 * Quick smoke-test: verify that env.ts parses in development mode.
 * Run:  npx tsx scripts/test-env.ts
 */
import "../src/load-env";
import { env } from "../src/config/env";

console.log("✅ ENV parsed OK");
console.log("  NODE_ENV:", env.NODE_ENV);
console.log("  JWT_ACCESS_SECRET length:", env.JWT_ACCESS_SECRET.length);
console.log("  JWT_REFRESH_SECRET length:", env.JWT_REFRESH_SECRET.length);
console.log("  ACCESS === REFRESH?", env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET);

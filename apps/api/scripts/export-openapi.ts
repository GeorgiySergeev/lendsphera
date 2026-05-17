import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const document = {
  openapi: "3.1.0",
  info: {
    title: "Lendsphera API",
    version: "1.0"
  },
  paths: {
    "/api/v1/health": {
      get: {
        summary: "Health check",
        responses: {
          "200": {
            description: "Service is healthy"
          }
        }
      }
    }
  },
  components: {
    securitySchemes: {
      bearer: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT"
      }
    }
  }
} as const;

const outDir = join(__dirname, "..", "..", "..", "openapi");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "openapi.json"), JSON.stringify(document, null, 2));
console.warn("openapi/openapi.json written");

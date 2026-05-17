import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  client: "@hey-api/client-fetch",
  input: "../../openapi/openapi.json",
  output: "src/generated"
});

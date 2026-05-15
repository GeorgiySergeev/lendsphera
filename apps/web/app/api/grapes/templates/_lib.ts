import { readFile } from "node:fs/promises";
import { join } from "node:path";

async function readPlatformApiKey() {
  if (process.env.GRAPES_PLATFORM_API_KEY) {
    return process.env.GRAPES_PLATFORM_API_KEY;
  }

  try {
    const rootEnvPath = join(process.cwd(), ".env");
    const raw = await readFile(rootEnvPath, "utf8");
    const line = raw
      .split(/\r?\n/)
      .find((entry) => entry.startsWith("GRAPES_PLATFORM_API_KEY="));

    if (!line) {
      return null;
    }

    return line.slice("GRAPES_PLATFORM_API_KEY=".length).trim() || null;
  } catch {
    return null;
  }
}

export { readPlatformApiKey };

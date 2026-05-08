import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { widgetSchemas, type WidgetManifestItem } from "../src/index";

const version = process.env.npm_package_version ?? "0.1.0";
const outputDirectory = join(import.meta.dirname, "..", "dist", "widgets");
const entries = ["countdown-timer", "exit-intent-popup", "fortune-wheel"] as const;

async function main() {
  const manifest: WidgetManifestItem[] = [];

  for (const slug of entries) {
    const bundle = `${slug}.es.js`;
    const contents = await readFile(join(outputDirectory, bundle));
    const hash = createHash("sha256").update(contents).digest("hex");

    manifest.push({
      bundle,
      hash,
      schema: widgetSchemas[slug],
      slug,
      version
    });
  }

  await mkdir(outputDirectory, { recursive: true });
  await writeFile(
    join(outputDirectory, "manifest.json"),
    `${JSON.stringify({ generatedAt: new Date().toISOString(), widgets: manifest }, null, 2)}\n`
  );
}

await main();

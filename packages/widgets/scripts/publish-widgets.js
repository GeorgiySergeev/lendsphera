import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
const outputDirectory = join(import.meta.dirname, "..", "dist", "widgets");
const requiredEnv = [
  "S3_BUCKET",
  "S3_REGION",
  "S3_ACCESS_KEY",
  "S3_SECRET_KEY",
  "WIDGET_BUNDLE_BASE_URL",
  "WIDGET_REGISTRY_API_URL",
  "WIDGET_REGISTRY_TOKEN"
];
async function main() {
  assertEnvironment();
  const manifest = JSON.parse(
    await readFile(join(outputDirectory, "manifest.json"), "utf8")
  );
  const s3 = new S3Client({
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY,
      secretAccessKey: process.env.S3_SECRET_KEY
    },
    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: Boolean(process.env.S3_ENDPOINT),
    region: process.env.S3_REGION
  });
  await uploadObject(
    s3,
    "widgets/manifest.json",
    Buffer.from(JSON.stringify(manifest, null, 2)),
    "application/json"
  );
  for (const widget of manifest.widgets) {
    const bundle = await readFile(join(outputDirectory, widget.bundle));
    const key = `widgets/${widget.version}/${widget.bundle}`;
    const bundleHash = createHash("sha256").update(bundle).digest("hex");
    const bundleUrl = `${process.env.WIDGET_BUNDLE_BASE_URL.replace(/\/$/, "")}/${key}`;
    await uploadObject(s3, key, bundle, "text/javascript; charset=utf-8");
    await registerWidgetVersion({
      bundleHash,
      bundleUrl,
      schema: widget.schema,
      slug: widget.slug,
      version: widget.version
    });
  }
}
async function uploadObject(s3, key, body, contentType) {
  await s3.send(
    new PutObjectCommand({
      Body: body,
      Bucket: process.env.S3_BUCKET,
      ContentType: contentType,
      Key: key
    })
  );
}
async function registerWidgetVersion(input) {
  const apiUrl = process.env.WIDGET_REGISTRY_API_URL.replace(/\/$/, "");
  const headers = {
    Authorization: `Bearer ${process.env.WIDGET_REGISTRY_TOKEN}`,
    "Content-Type": "application/json"
  };
  const widgetResponse = await fetch(
    `${apiUrl}/widgets?search=${encodeURIComponent(input.slug)}`,
    { headers }
  );
  if (!widgetResponse.ok) {
    throw new Error(`Failed to query widget ${input.slug}: ${widgetResponse.status}`);
  }
  const widgetList = await widgetResponse.json();
  const existing = widgetList.items?.find((widget) => widget.slug === input.slug);
  const widgetId = existing?.id ?? (await createWidget(apiUrl, headers, input.slug));
  const versionResponse = await fetch(`${apiUrl}/widgets/${widgetId}/versions`, {
    body: JSON.stringify({
      bundleHash: input.bundleHash,
      bundleUrl: input.bundleUrl,
      isLatest: true,
      schema: input.schema,
      version: input.version
    }),
    headers,
    method: "POST"
  });
  if (!versionResponse.ok) {
    throw new Error(
      `Failed to register widget version ${input.slug}@${input.version}: ${versionResponse.status}`
    );
  }
}
async function createWidget(apiUrl, headers, slug) {
  const response = await fetch(`${apiUrl}/widgets`, {
    body: JSON.stringify({
      category: "engagement",
      name: toTitle(slug),
      slug,
      status: "PUBLISHED",
      tags: ["landing", "widget"],
      type: "VANILLA_JS"
    }),
    headers,
    method: "POST"
  });
  if (!response.ok) {
    throw new Error(`Failed to create widget ${slug}: ${response.status}`);
  }
  const widget = await response.json();
  return widget.id;
}
function assertEnvironment() {
  for (const key of requiredEnv) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable ${key}`);
    }
  }
}
function toTitle(slug) {
  return slug
    .split("-")
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}
await main();

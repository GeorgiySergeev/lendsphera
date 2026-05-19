import AdmZip from "adm-zip";
import type { Express } from "express";
import { Readable } from "node:stream";
import { describe, expect, it } from "vitest";

import { validateZip } from "./zip-import.validator";

function buildZip(entries: Record<string, string | Buffer>): Buffer {
  const zip = new AdmZip();
  for (const [name, content] of Object.entries(entries)) {
    const buffer = typeof content === "string" ? Buffer.from(content, "utf-8") : content;
    zip.addFile(name, buffer);
  }
  return zip.toBuffer();
}

function makeFile(
  buffer: Buffer,
  overrides: Partial<Express.Multer.File> = {}
): Express.Multer.File {
  return {
    fieldname: "file",
    originalname: (overrides.originalname as string) ?? "landing.zip",
    encoding: "7bit",
    mimetype: overrides.mimetype ?? "application/zip",
    size: buffer.length,
    destination: "",
    filename: "landing.zip",
    path: "",
    buffer,
    stream: Readable.from(buffer),
    ...overrides
  } as Express.Multer.File;
}

describe("validateZip", () => {
  it("rejects non-zip mimetype", () => {
    const file = makeFile(Buffer.from("not a zip"), { mimetype: "text/plain" });
    const result = validateZip(file);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/must be a ZIP/i);
  });

  it("rejects archives missing index.html", () => {
    const buffer = buildZip({ "about.html": "<html></html>" });
    const file = makeFile(buffer);
    const result = validateZip(file);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/index\.(html|php)/i);
  });

  it("accepts archives with index.php in the root", () => {
    const buffer = buildZip({ "index.php": "<?php echo $PRODUCT_NAME; ?>" });
    const file = makeFile(buffer);
    const result = validateZip(file);

    expect(result.valid).toBe(true);
  });

  it("accepts extra php files alongside an index.php entrypoint", () => {
    const buffer = buildZip({
      "index.php": "<?php echo $PRODUCT_NAME; ?>",
      "partials/header.php": "<?php echo 'header'; ?>"
    });
    const file = makeFile(buffer);
    const result = validateZip(file);

    expect(result.valid).toBe(true);
  });

  it("accepts valid zip and returns metadata", () => {
    const buffer = buildZip({
      "index.html": "<html><body>Hello</body></html>",
      "assets/logo.png": Buffer.from([0, 1, 2, 3])
    });
    const file = makeFile(buffer);
    const result = validateZip(file);

    expect(result.valid).toBe(true);
    expect(result.entries).toBe(2);
    expect(result.uncompressedSize).toBeGreaterThan(0);
  });
});

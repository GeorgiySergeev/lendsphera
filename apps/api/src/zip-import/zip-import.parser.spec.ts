import AdmZip from "adm-zip";
import type { Express } from "express";
import { Readable } from "node:stream";
import { describe, expect, it } from "vitest";

import {
  extractDocument,
  extractImportedCodeVariables,
  extractSections,
  parseZipLanding,
  rewriteAssetUrls
} from "./zip-import.parser";

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

describe("parseZipLanding", () => {
  it("returns index html, assets, and css files", () => {
    const buffer = buildZip({
      "index.html": `<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="styles/main.css" />
</head>
<body>
  <div class="hero">
    <img src="images/logo.png" alt="Logo" />
  </div>
</body>
</html>`,
      "styles/main.css": "body { background: url('images/bg.png'); }",
      "images/logo.png": Buffer.from([1, 2, 3]),
      "images/bg.png": Buffer.from([4, 5, 6])
    });

    const file = makeFile(buffer);
    const parsed = parseZipLanding(file);

    expect(parsed.indexHtml.path).toBe("index.html");
    expect(parsed.assets).toHaveLength(3);
    expect(parsed.cssFiles).toHaveLength(1);
  });

  it("throws when index.html is missing", () => {
    const buffer = buildZip({ "other.html": "<html></html>" });
    const file = makeFile(buffer);

    expect(() => parseZipLanding(file)).toThrow(/index\.(html|php)/i);
  });

  it("accepts index.php as the entrypoint", () => {
    const buffer = buildZip({
      "index.php": `<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="styles/main.css" />
</head>
<body>
  <div class="hero"><?php echo $PRODUCT_NAME; ?></div>
</body>
</html>`,
      "styles/main.css": ".hero { color: red; }"
    });

    const file = makeFile(buffer);
    const parsed = parseZipLanding(file);

    expect(parsed.indexHtml.path).toBe("index.php");
    expect(parsed.indexHtml.content).toContain("$PRODUCT_NAME");
  });
});

describe("rewriteAssetUrls", () => {
  it("rewrites asset references in html and css", () => {
    const buffer = buildZip({
      "nested/index.html": `<html><head><link rel="stylesheet" href="../styles/main.css" /></head><body><img src="./images/logo.png" alt="" /><script src="../js/plugins.min.js"></script></body></html>`,
      "styles/main.css": "body { background-image: url('../images/bg.png'); }",
      "images/logo.png": Buffer.from([1, 2, 3]),
      "images/bg.png": Buffer.from([4, 5, 6]),
      "js/plugins.min.js": "console.log('ok');"
    });

    const file = makeFile(buffer);
    const parsed = parseZipLanding(file);
    const assetMap = new Map(
      parsed.assets.map((asset) => [asset.path, `https://cdn.example.com/${asset.path}`])
    );

    const { html, css } = rewriteAssetUrls(
      parsed.indexHtml.path,
      parsed.indexHtml.content,
      parsed.cssFiles,
      assetMap
    );
    const document = extractDocument(html);
    const sections = extractSections(html, css);

    expect(document.linkedCss).toContain("https://cdn.example.com/styles/main.css");
    expect(document.body).toContain("https://cdn.example.com/images/logo.png");
    expect(document.scripts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          src: "https://cdn.example.com/js/plugins.min.js"
        })
      ])
    );
    expect(css[0].content).toContain("https://cdn.example.com/images/bg.png");
    expect(
      sections.some((section) =>
        section.html?.includes("cdn.example.com/images/logo.png")
      )
    ).toBe(true);
    expect(
      sections.some((section) =>
        section.html?.includes("cdn.example.com/js/plugins.min.js")
      )
    ).toBe(true);
    expect(sections[0]?.cssRefs).toContain("styles/main.css");
  });
});

describe("extractImportedCodeVariables", () => {
  it("detects PHP and runtime placeholder variables from landing code", () => {
    const variables = extractImportedCodeVariables(`
      <section>
        <?php echo $PRODUCT_NAME; ?>
        <?php echo $PRODUCT_PRICE; ?>
        <div>{{LS_PRODUCT_NAME}}</div>
        <div>{{ LS_PRICE }}</div>
      </section>
    `);

    expect(variables).toEqual([
      { key: "PRODUCT_NAME", source: "php", syntax: "$PRODUCT_NAME" },
      { key: "PRODUCT_PRICE", source: "php", syntax: "$PRODUCT_PRICE" },
      { key: "LS_PRICE", source: "placeholder", syntax: "{{LS_PRICE}}" },
      {
        key: "LS_PRODUCT_NAME",
        source: "placeholder",
        syntax: "{{LS_PRODUCT_NAME}}"
      }
    ]);
  });
});

import AdmZip from "adm-zip";
import { describe, expect, beforeEach, it, vi } from "vitest";
import type { Express } from "express";
import { Readable } from "node:stream";

import type { AuthUser } from "../common/current-user.decorator";
import { ZipImportService } from "./zip-import.service";

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

describe("ZipImportService", () => {
  const user: AuthUser = { id: "user-1", email: "user@example.com", role: "EDITOR" };

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <link rel="stylesheet" href="styles/main.css" />
</head>
<body>
  <section class="hero">
    <img src="images/logo.png" alt="Logo" />
  </section>
</body>
</html>`;

  const css = ".hero { background-image: url('../images/bg.png'); }";

  const zipBuffer = buildZip({
    "index.html": html,
    "styles/main.css": css,
    "images/logo.png": Buffer.from([1, 2, 3]),
    "images/bg.png": Buffer.from([4, 5, 6])
  });

  let prisma: {
    landing: {
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      findUniqueOrThrow: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
    };
    version: {
      findFirst: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };

  let storage: {
    putObject: ReturnType<typeof vi.fn>;
    getObjectUrl: ReturnType<typeof vi.fn>;
  };

  let service: ZipImportService;

  beforeEach(() => {
    const landingRecord = { id: "landing-123" };
    const versionRecord = { id: "version-123" };

    prisma = {
      landing: {
        create: vi.fn().mockResolvedValue(landingRecord),
        update: vi.fn().mockResolvedValue(undefined),
        findUniqueOrThrow: vi.fn().mockResolvedValue(landingRecord),
        findFirst: vi.fn().mockResolvedValue(null)
      },
      version: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(versionRecord)
      },
      $transaction: vi.fn()
    };

    prisma.$transaction.mockImplementation(async (callback) => {
      const tx = {
        landing: {
          create: prisma.landing.create,
          update: prisma.landing.update,
          findUniqueOrThrow: prisma.landing.findUniqueOrThrow,
          findFirst: prisma.landing.findFirst
        },
        version: {
          findFirst: prisma.version.findFirst,
          create: prisma.version.create
        }
      };
      return callback(tx as never);
    });

    storage = {
      putObject: vi.fn().mockResolvedValue(undefined),
      getObjectUrl: vi.fn((key: string) => `https://cdn.example.com/${key}`)
    };

    service = new ZipImportService(prisma as never, storage as never);
  });

  it("creates landing and version from zip", async () => {
    const result = await service.createFromZip(
      {
        name: "Test Landing",
        slug: "test-landing",
        geoId: "geo-1",
        categoryId: "cat-1",
        variantId: "variant-1",
        templateId: undefined,
        publicId: undefined,
        file: makeFile(zipBuffer)
      },
      user
    );

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.landing.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Test Landing",
          status: "DRAFT"
        })
      })
    );

    const versionPayload = prisma.version.create.mock.calls[0][0]?.data;
    expect(versionPayload?.versionNum).toBe(1);
    expect(versionPayload?.html).toContain(
      "https://cdn.example.com/landings/landing-123/versions/1/assets/styles/main.css"
    );
    expect(versionPayload?.grapesJson).toMatchObject({
      importedLanding: expect.objectContaining({
        entrypoint: "index.html"
      })
    });

    expect(storage.putObject).toHaveBeenCalledWith(
      expect.objectContaining({ key: "landings/landing-123/versions/1/source.zip" })
    );
    expect(
      storage.putObject.mock.calls.filter((call) =>
        call[0]?.key.endsWith("styles/main.css")
      )
    ).toHaveLength(1);

    expect(result.importedLanding.assets).toHaveLength(3);
    expect(result.importedLanding.source.s3Key).toBe(
      "landings/landing-123/versions/1/source.zip"
    );
    expect(result.importedLanding.document.rawHtml).toContain(
      "https://cdn.example.com/landings/landing-123/versions/1/assets/images/logo.png"
    );
  });

  it("increments version numbers when replacing draft", async () => {
    prisma.version.findFirst.mockResolvedValueOnce({ versionNum: 2 });

    const result = await service.replaceDraft(
      {
        landingId: "landing-123",
        file: makeFile(zipBuffer)
      },
      user
    );

    const versionPayload = prisma.version.create.mock.calls[0][0]?.data;
    expect(versionPayload?.versionNum).toBe(3);
    expect(storage.putObject).toHaveBeenCalledWith(
      expect.objectContaining({ key: "landings/landing-123/versions/3/source.zip" })
    );
    expect(result.importedLanding.source.s3Key).toBe(
      "landings/landing-123/versions/3/source.zip"
    );
  });

  it("imports zips whose entrypoint is index.php", async () => {
    const phpZipBuffer = buildZip({
      "index.php": `<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="styles/main.css" />
</head>
<body>
  <section class="hero"><?php echo $PRODUCT_NAME; ?></section>
</body>
</html>`,
      "styles/main.css": ".hero { color: red; }",
      "images/logo.png": Buffer.from([1, 2, 3])
    });

    const result = await service.createFromZip(
      {
        name: "PHP Landing",
        slug: "php-landing",
        geoId: "geo-1",
        categoryId: "cat-1",
        variantId: "variant-1",
        file: makeFile(phpZipBuffer, { originalname: "php-landing.zip" })
      },
      user
    );

    expect(result.importedLanding.entrypoint).toBe("index.php");
    expect(result.importedLanding.document.rawHtml).toContain(
      "<?php echo $PRODUCT_NAME; ?>"
    );
    expect(result.importedLanding.variables).toEqual([
      { key: "PRODUCT_NAME", source: "php", syntax: "$PRODUCT_NAME" }
    ]);
    const versionPayload = prisma.version.create.mock.calls.at(-1)?.[0]?.data;
    expect(versionPayload?.message).toContain("php-landing.zip");
  });

  it("auto-increments slug and publicId when the base values already exist", async () => {
    prisma.landing.create.mockResolvedValueOnce({ id: "landing-456" });
    prisma.landing.findFirst = vi
      .fn()
      .mockResolvedValueOnce({ id: "existing-1" })
      .mockResolvedValueOnce(null);

    prisma.$transaction.mockImplementation(async (callback) => {
      const tx = {
        landing: {
          create: prisma.landing.create,
          update: prisma.landing.update,
          findUniqueOrThrow: prisma.landing.findUniqueOrThrow,
          findFirst: prisma.landing.findFirst
        },
        version: {
          findFirst: prisma.version.findFirst,
          create: prisma.version.create
        }
      };
      return callback(tx as never);
    });

    await service.createFromZip(
      {
        name: "Duplicate Landing",
        slug: "duplicate-landing",
        publicId: "duplicate-landing",
        geoId: "geo-1",
        categoryId: "cat-1",
        variantId: "variant-1",
        file: makeFile(zipBuffer)
      },
      user
    );

    expect(prisma.landing.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          slug: "duplicate-landing-2",
          publicId: "duplicate-landing-2"
        })
      })
    );
  });
});

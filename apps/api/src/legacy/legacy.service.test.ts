import AdmZip from "adm-zip";
import { BadRequestException } from "@nestjs/common";
import { LegacySource, Role } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { LegacyService } from "./legacy.service";

const user = { email: "owner@example.test", id: "user_1", role: Role.OWNER };

function createService(
  prisma: Record<string, unknown>,
  storage: Record<string, unknown>
) {
  return new LegacyService(prisma as never, storage as never);
}

function zipBuffer(entries: Record<string, string>) {
  const zip = new AdmZip();

  for (const [name, content] of Object.entries(entries)) {
    zip.addFile(name, Buffer.from(content));
  }

  return zip.toBuffer();
}

describe("LegacyService repository workflow", () => {
  it("rejects uploaded paths with traversal", async () => {
    const service = createService({}, {});

    await expect(
      service.upload(
        [
          {
            buffer: Buffer.from("<h1>Bad</h1>"),
            mimetype: "text/html",
            originalname: "../index.html",
            size: 12
          }
        ],
        {},
        user
      )
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("uploads ZIP files into S3 and indexes text content", async () => {
    const putObject = vi.fn();
    const upsert = vi.fn();
    const service = createService(
      {
        legacyFile: {
          findMany: vi.fn().mockResolvedValue([
            { id: "file_1", path: "index.html", size: 12 },
            { id: "file_2", path: "assets/app.js", size: 10 }
          ]),
          upsert
        },
        legacyLanding: {
          create: vi.fn().mockResolvedValue({ id: "legacy_1" }),
          update: vi.fn().mockResolvedValue({ id: "legacy_1", files: [] })
        }
      },
      { bucket: "landing-assets", putObject }
    );

    await service.upload(
      [
        {
          buffer: zipBuffer({
            "assets/app.js": "console.log(1)",
            "index.html": "<h1>Hello</h1>"
          }),
          mimetype: "application/zip",
          originalname: "legacy.zip",
          size: 100
        }
      ],
      {},
      user
    );

    expect(putObject).toHaveBeenCalledWith(
      expect.objectContaining({ key: "legacy/legacy_1/index.html" })
    );
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          extension: "html",
          isBinary: false,
          path: "index.html",
          textContent: "<h1>Hello</h1>"
        })
      })
    );
  });

  it("saves editable content back to storage and updates the index", async () => {
    const putObject = vi.fn();
    const update = vi
      .fn()
      .mockResolvedValue({ id: "file_1", textContent: "<h1>New</h1>" });
    const service = createService(
      {
        legacyFile: {
          findUniqueOrThrow: vi.fn().mockResolvedValue({
            extension: "html",
            id: "file_1",
            path: "index.html",
            s3Key: "legacy/legacy_1/index.html"
          }),
          update
        }
      },
      { putObject }
    );

    await service.saveFileContent("file_1", { content: "<h1>New</h1>" }, user);

    expect(putObject).toHaveBeenCalledWith(
      expect.objectContaining({
        body: Buffer.from("<h1>New</h1>", "utf8"),
        key: "legacy/legacy_1/index.html"
      })
    );
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          size: Buffer.byteLength("<h1>New</h1>"),
          textContent: "<h1>New</h1>",
          updatedById: "user_1"
        })
      })
    );
  });

  it("creates a landing, first version, and legacy import link", async () => {
    const tx = {
      landing: {
        create: vi.fn().mockResolvedValue({ id: "landing_1" }),
        findUniqueOrThrow: vi.fn().mockResolvedValue({ id: "landing_1" }),
        update: vi.fn()
      },
      legacyLanding: {
        update: vi.fn()
      },
      template: {
        upsert: vi.fn().mockResolvedValue({ id: "template_legacy" })
      },
      version: {
        create: vi.fn().mockResolvedValue({ id: "version_1" })
      }
    };
    const service = createService(
      {
        $transaction: vi.fn(async (callback: (transaction: typeof tx) => unknown) =>
          callback(tx)
        ),
        legacyFile: {
          findUnique: vi.fn().mockResolvedValue(null),
          findUniqueOrThrow: vi.fn().mockResolvedValue({
            extension: "html",
            id: "file_1",
            legacy: { id: "legacy_1" },
            legacyLandingId: "legacy_1",
            path: "index.html",
            s3Key: "legacy/legacy_1/index.html",
            textContent:
              '<html><head><link href="style.css" rel="stylesheet"></head><body></body></html>'
          })
        }
      },
      { getObjectBuffer: vi.fn() }
    );

    await service.importAsLanding(
      "file_1",
      {
        categoryId: "category_1",
        geoId: "geo_1",
        name: "Imported Legacy",
        variantId: "variant_1"
      },
      user
    );

    expect(tx.landing.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          categoryId: "category_1",
          geoId: "geo_1",
          name: "Imported Legacy",
          templateId: "template_legacy",
          variantId: "variant_1"
        })
      })
    );
    expect(tx.version.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          html: expect.stringContaining("<html>"),
          landingId: "landing_1",
          versionNum: 1
        })
      })
    );
    expect(tx.legacyLanding.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ importedAsId: "landing_1" }),
        where: { id: "legacy_1" }
      })
    );
  });

  it("connects a GitHub repository as a legacy root and indexes files", async () => {
    const service = createService(
      {
        legacyFile: {
          deleteMany: vi.fn(),
          findMany: vi.fn().mockResolvedValue([])
        },
        legacyLanding: {
          create: vi.fn().mockResolvedValue({ id: "legacy_git" }),
          findFirst: vi.fn().mockResolvedValue(null),
          findUniqueOrThrow: vi.fn().mockResolvedValue({
            branch: "main",
            id: "legacy_git",
            source: LegacySource.GIT_REPO,
            sourceUrl: "https://github.com/GeorgiySergeev/landing-legacy-2"
          }),
          update: vi
            .fn()
            .mockResolvedValueOnce({ id: "legacy_git" })
            .mockResolvedValueOnce({ id: "legacy_git" })
            .mockResolvedValueOnce({ id: "legacy_git", files: [] })
        }
      },
      {}
    );
    const cloneSpy = vi
      .spyOn(
        service as unknown as {
          cloneAndIndexGitRepository: (input: unknown) => Promise<{
            commitSha: string;
            paths: Set<string>;
          }>;
        },
        "cloneAndIndexGitRepository"
      )
      .mockResolvedValue({
        commitSha: "5dd75f5",
        paths: new Set(["index.html"])
      });

    await service.connectGitRepository(
      {
        branch: "main",
        url: "https://github.com/GeorgiySergeev/landing-legacy-2"
      },
      user
    );

    expect(cloneSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        branch: "main",
        legacyLandingId: "legacy_git",
        sourceUrl: "https://github.com/GeorgiySergeev/landing-legacy-2"
      })
    );
  });

  it("rejects non-Git legacy roots during sync", async () => {
    const service = createService(
      {
        legacyLanding: {
          findUniqueOrThrow: vi.fn().mockResolvedValue({
            id: "legacy_1",
            source: LegacySource.UPLOAD,
            sourceUrl: null
          })
        }
      },
      {}
    );

    await expect(service.syncGitRepository("legacy_1", user)).rejects.toBeInstanceOf(
      BadRequestException
    );
  });
});

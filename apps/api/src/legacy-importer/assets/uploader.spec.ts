import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { createHash } from "node:crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import { LegacyAssetUploaderService } from "./uploader.service";

describe("legacy importer asset uploader", () => {
  it("dedups same content across landings into one Asset row", async () => {
    const file = await makeTempFile("same-image.webp", Buffer.from("same bytes"));
    const digest = sha256(Buffer.from("same bytes"));
    const prisma = createPrismaMock();
    const sendSpy = mockS3();
    const service = new LegacyAssetUploaderService(prisma as never);

    const first = await service.upload({
      filePath: file,
      landingId: "landing-a",
      mimeType: "image/webp",
      uploaderId: "user-1"
    });

    const second = await service.upload({
      filePath: file,
      landingId: "landing-b",
      mimeType: "image/webp",
      uploaderId: "user-1"
    });

    expect(first.id).toBe(second.id);
    expect(prisma.__created.length).toBe(1);
    expect(prisma.__created[0]?.hash).toBe(digest);
    expect(sendSpy).toHaveBeenCalledTimes(2);

    await cleanupTempFile(file);
    sendSpy.mockRestore();
  });

  it("streams a 10MB file to S3 body as Readable", async () => {
    const tenMb = Buffer.alloc(10 * 1024 * 1024, 1);
    const file = await makeTempFile("big-image.png", tenMb);
    const prisma = createPrismaMock();
    const sendSpy = mockS3();
    const service = new LegacyAssetUploaderService(prisma as never);

    await service.upload({
      filePath: file,
      landingId: "landing-1",
      uploaderId: "user-1"
    });

    const putCall = sendSpy.mock.calls.find(
      (call) => call[0] instanceof PutObjectCommand
    )?.[0] as PutObjectCommand | undefined;

    expect(putCall).toBeDefined();
    if (!putCall) {
      throw new Error("PutObjectCommand call was not captured");
    }
    expect(putCall.input.Body).toBeInstanceOf(Readable);
    expect(prisma.__created[0]?.size).toBe(10 * 1024 * 1024);

    await cleanupTempFile(file);
    sendSpy.mockRestore();
  });

  it("retains webp mime type", async () => {
    const file = await makeTempFile("hero.webp", Buffer.from("webp"));
    const prisma = createPrismaMock();
    const sendSpy = mockS3();
    const service = new LegacyAssetUploaderService(prisma as never);

    const created = await service.upload({
      filePath: file,
      landingId: "landing-1",
      mimeType: "image/webp",
      uploaderId: "user-1"
    });

    expect(created.mimeType).toBe("image/webp");

    await cleanupTempFile(file);
    sendSpy.mockRestore();
  });

  it("rejects non-image extension with clear error", async () => {
    const file = await makeTempFile("script.exe", Buffer.from("x"));
    const prisma = createPrismaMock();
    const sendSpy = mockS3();
    const service = new LegacyAssetUploaderService(prisma as never);

    await expect(
      service.upload({
        filePath: file,
        landingId: "landing-1",
        uploaderId: "user-1"
      })
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.upload({
        filePath: file,
        landingId: "landing-1",
        uploaderId: "user-1"
      })
    ).rejects.toThrow(/Only image files are allowed/i);

    await cleanupTempFile(file);
    sendSpy.mockRestore();
  });
});

function createPrismaMock() {
  const created: Array<Record<string, unknown>> = [];
  const byHash = new Map<string, Record<string, unknown>>();

  return {
    __created: created,
    asset: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const row = { id: `asset-${created.length + 1}`, ...data };
        created.push(row);
        if (typeof data.hash === "string") {
          byHash.set(data.hash, row);
        }
        return row;
      }),
      findFirst: vi.fn(async ({ where }: { where: { hash?: string } }) => {
        if (!where.hash) {
          return null;
        }
        return byHash.get(where.hash) ?? null;
      })
    }
  };
}

function mockS3() {
  return vi.spyOn(S3Client.prototype, "send").mockResolvedValue({} as never);
}

async function makeTempFile(name: string, content: Buffer) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "legacy-asset-uploader-"));
  const file = path.join(dir, name);
  await writeFile(file, content);
  return file;
}

async function cleanupTempFile(filePath: string) {
  await rm(path.dirname(filePath), { force: true, recursive: true });
}

function sha256(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

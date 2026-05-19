import { describe, expect, it, vi } from "vitest";

import { MediaService } from "./media.service";

describe("MediaService", () => {
  it("filters landing-scoped media by landingId and mute flag", async () => {
    const prisma = {
      asset: {
        count: vi.fn().mockResolvedValue(1),
        findMany: vi.fn().mockResolvedValue([
          {
            id: "asset-1",
            landingId: "landing-1",
            isMuted: false,
            originalName: "hero.png",
            mimeType: "image/png",
            type: "IMAGE",
            s3Key: "media/hero.png",
            s3Bucket: "bucket",
            size: 123,
            width: 1200,
            height: 800,
            folderId: null,
            tags: [],
            createdAt: new Date().toISOString(),
            uploader: { id: "user-2", name: "Other", email: "other@example.com" }
          }
        ])
      }
    } as any;

    const storage = {
      getSignedUrl: vi.fn().mockResolvedValue("https://signed.example/hero.png")
    } as any;

    const service = new MediaService(prisma, storage);
    const result = await service.listMedia(
      {
        landingId: "landing-1",
        muted: false,
        page: 1,
        limit: 40,
        sortBy: "createdAt",
        sortOrder: "desc"
      } as any,
      { id: "user-1" } as any
    );

    expect(prisma.asset.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          landingId: "landing-1",
          isMuted: false,
          OR: [{ uploaderId: "user-1" }, { landing: { is: { ownerId: "user-1" } } }]
        })
      })
    );
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        id: "asset-1",
        url: "https://signed.example/hero.png"
      })
    );
  });

  it("updates rename and mute fields on an asset", async () => {
    const prisma = {
      asset: {
        findFirst: vi.fn().mockResolvedValue({
          id: "asset-1",
          landingId: "landing-1",
          uploaderId: "user-1",
          originalName: "before.png",
          s3Key: "media/before.png",
          isMuted: false,
          deletedAt: null
        }),
        update: vi.fn().mockResolvedValue({
          id: "asset-1",
          landingId: "landing-1",
          uploaderId: "user-1",
          originalName: "after.png",
          mimeType: "image/png",
          type: "IMAGE",
          s3Key: "media/before.png",
          s3Bucket: "bucket",
          size: 123,
          width: 1200,
          height: 800,
          folderId: null,
          tags: [],
          isMuted: true,
          createdAt: new Date().toISOString()
        })
      }
    } as any;

    const storage = {
      getSignedUrl: vi.fn().mockResolvedValue("https://signed.example/after.png")
    } as any;

    const service = new MediaService(prisma, storage);
    const result = await service.updateAsset(
      "asset-1",
      { originalName: "after.png", isMuted: true },
      { id: "user-1" } as any
    );

    expect(prisma.asset.update).toHaveBeenCalledWith({
      where: { id: "asset-1" },
      data: expect.objectContaining({
        originalName: "after.png",
        isMuted: true
      })
    });
    expect(result).toEqual(
      expect.objectContaining({
        originalName: "after.png",
        isMuted: true,
        url: "https://signed.example/after.png"
      })
    );
  });
});

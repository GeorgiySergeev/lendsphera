import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { PassThrough, Transform } from "node:stream";
import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";
import { BadRequestException, Injectable } from "@nestjs/common";
import { AssetType, type Asset } from "@prisma/client";

import { env } from "../../config/env";
import { PrismaService } from "../../prisma/prisma.service";

const IMAGE_MIME_BY_EXT: Record<string, string> = {
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp"
};

export type UploadLegacyAssetInput = {
  filePath: string;
  landingId?: string;
  mimeType?: string;
  originalName?: string;
  uploaderId: string;
};

@Injectable()
export class LegacyAssetUploaderService {
  private readonly client = new S3Client({
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY,
      secretAccessKey: env.S3_SECRET_KEY
    },
    endpoint: env.S3_ENDPOINT,
    forcePathStyle: true,
    region: env.S3_REGION
  });

  private bucketReady?: Promise<void>;

  constructor(private readonly prisma: PrismaService) {}

  async upload(input: UploadLegacyAssetInput): Promise<Asset> {
    const resolvedMime = this.resolveImageMime(input.filePath, input.mimeType);
    const fileStats = await stat(input.filePath);
    const digest = await this.hashFile(input.filePath);
    const existing = await this.findByHash(digest, fileStats.size);
    if (existing) {
      return existing;
    }

    await this.ensureBucket();
    const fileName = path.basename(input.originalName ?? input.filePath);
    const s3Key = `legacy-assets/${digest.slice(0, 12)}/${fileName}`;
    const source = createReadStream(input.filePath);

    await this.client.send(
      new PutObjectCommand({
        Body: source,
        Bucket: env.S3_BUCKET,
        ContentType: resolvedMime,
        Key: s3Key
      })
    );

    return this.prisma.asset.create({
      data: {
        folder: "legacy-imports",
        hash: digest,
        landingId: input.landingId,
        mimeType: resolvedMime,
        originalName: input.originalName ?? path.basename(input.filePath),
        s3Bucket: env.S3_BUCKET,
        s3Key,
        size: fileStats.size,
        type: AssetType.IMAGE,
        uploaderId: input.uploaderId
      }
    });
  }

  private async hashFile(filePath: string): Promise<string> {
    const source = createReadStream(filePath);
    const hash = createHash("sha256");

    await pipeline(
      source,
      new Transform({
        transform(chunk, _encoding, callback) {
          hash.update(chunk as Buffer);
          callback(null, chunk);
        }
      }),
      new PassThrough({
        write(_chunk, _encoding, callback) {
          callback();
        }
      })
    );

    return hash.digest("hex");
  }

  private findByHash(digest: string, size: number): Promise<Asset | null> {
    return this.prisma.asset.findFirst({
      where: {
        deletedAt: null,
        hash: digest,
        size,
        type: AssetType.IMAGE
      }
    });
  }

  private resolveImageMime(filePath: string, explicitMime?: string) {
    if (explicitMime?.startsWith("image/")) {
      return explicitMime;
    }

    const ext = path.extname(filePath).toLowerCase();
    const mime = IMAGE_MIME_BY_EXT[ext];

    if (!mime) {
      throw new BadRequestException(
        `Unsupported asset extension "${ext || "(none)"}". Only image files are allowed.`
      );
    }

    return mime;
  }

  private async ensureBucket() {
    this.bucketReady ??= (async () => {
      try {
        await this.client.send(new HeadBucketCommand({ Bucket: env.S3_BUCKET }));
      } catch {
        await this.client.send(new CreateBucketCommand({ Bucket: env.S3_BUCKET }));
      }
    })();

    await this.bucketReady;
  }
}

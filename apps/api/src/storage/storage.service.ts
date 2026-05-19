import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Injectable } from "@nestjs/common";

import { env } from "../config/env";

@Injectable()
export class StorageService {
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

  async putObject({
    body,
    contentType,
    key
  }: {
    body: Buffer | string;
    contentType?: string;
    key: string;
  }) {
    await this.getBucketReady();
    await this.client.send(
      new PutObjectCommand({
        Body: body,
        Bucket: env.S3_BUCKET,
        ContentType: contentType,
        Key: key
      })
    );
  }

  async getObjectBuffer(key: string) {
    await this.getBucketReady();
    const response = await this.client.send(
      new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key })
    );
    const bytes = await response.Body?.transformToByteArray();

    return Buffer.from(bytes ?? []);
  }

  get bucket() {
    return env.S3_BUCKET;
  }

  async deleteObject(key: string): Promise<void> {
    await this.getBucketReady();
    await this.client.send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
  }

  async getSignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    await this.getBucketReady();
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key }),
      { expiresIn: expiresInSeconds }
    );
  }

  getObjectUrl(key: string): string {
    const encodedKey = key
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/");
    return new URL(`${env.S3_BUCKET}/${encodedKey}`, env.S3_ENDPOINT).toString();
  }

  private async ensureBucket() {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: env.S3_BUCKET }));
    } catch {
      await this.client.send(new CreateBucketCommand({ Bucket: env.S3_BUCKET }));
    }
  }

  private getBucketReady() {
    this.bucketReady ??= this.ensureBucket();
    return this.bucketReady;
  }
}

import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { LandingStatus, PublishJobStatus } from "@prisma/client";
import { Job } from "bullmq";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

import { env } from "../config/env";
import { EventBusService } from "../events/event-bus.service";
import { PrismaService } from "../prisma/prisma.service";
import { renderVersionHtml } from "./render-version";

interface PublishJobData {
  publishJobId: string;
  landingId: string;
  versionId: string;
}

@Processor("publishLanding")
export class PublishProcessor extends WorkerHost {
  private readonly logger = new Logger(PublishProcessor.name);
  private readonly s3Client: S3Client;

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService
  ) {
    super();
    this.s3Client = new S3Client({
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY,
        secretAccessKey: env.S3_SECRET_KEY
      },
      forcePathStyle: true // Needed for MinIO
    });
  }

  async process(job: Job<PublishJobData, void, string>): Promise<void> {
    const { publishJobId, landingId, versionId } = job.data;
    const logs: string[] = [];

    const log = (msg: string) => {
      this.logger.log(`[Job ${publishJobId}] ${msg}`);
      logs.push(`[${new Date().toISOString()}] ${msg}`);
    };

    try {
      await this.prisma.publishJob.update({
        where: { id: publishJobId },
        data: { status: PublishJobStatus.RUNNING, startedAt: new Date() }
      });

      log("Started publish job.");

      const landing = await this.prisma.landing.findUniqueOrThrow({
        where: { id: landingId },
        include: { currentVersion: true }
      });

      if (!landing.currentVersion || landing.currentVersion.id !== versionId) {
        throw new Error("Target version is missing or not current.");
      }

      log("Rendering publish HTML...");
      const minifiedHtml = await renderVersionHtml({
        html: landing.currentVersion.html,
        css: landing.currentVersion.css,
        customCss: landing.currentVersion.customCss,
        customJs: landing.currentVersion.customJs,
        grapesJson: landing.currentVersion.grapesJson
      });

      log("Generating sitemap and robots.txt...");
      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n<url><loc>https://${landing.publicId}.landingbuilder.com/</loc></url>\n</urlset>`;
      const robots = `User-agent: *\nAllow: /\nSitemap: https://${landing.publicId}.landingbuilder.com/sitemap.xml`;

      log("Uploading to S3 (R2)...");
      const bucket = env.S3_BUCKET;
      const basePath = landing.publicId;

      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: `${basePath}/index.html`,
          Body: minifiedHtml,
          ContentType: "text/html"
        })
      );

      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: `${basePath}/sitemap.xml`,
          Body: sitemap,
          ContentType: "application/xml"
        })
      );

      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: `${basePath}/robots.txt`,
          Body: robots,
          ContentType: "text/plain"
        })
      );

      log("TODO: Invalidate Cloudflare cache (Skipped).");

      log("Updating landing status...");
      const publishedUrl = `https://${landing.publicId}.landingbuilder.com`; // Dummy URL

      await this.prisma.$transaction([
        this.prisma.landing.update({
          where: { id: landingId },
          data: {
            status: LandingStatus.PUBLISHED,
            publishedUrl,
            publishedAt: new Date()
          }
        }),
        this.prisma.publishJob.update({
          where: { id: publishJobId },
          data: {
            status: PublishJobStatus.SUCCESS,
            finishedAt: new Date(),
            resultUrl: publishedUrl,
            logs: logs.join("\n")
          }
        }),
        this.prisma.version.update({
          where: { id: versionId },
          data: { status: "PUBLISHED" }
        })
      ]);

      await this.eventBus.publish({
        event: "landing.published",
        at: new Date().toISOString(),
        landingId,
        versionId,
        source: "publish.job"
      });

      log("Publish job completed successfully.");
    } catch (error) {
      const errMessage = (error as Error).message;
      log(`Error: ${errMessage}`);

      await this.prisma.publishJob.update({
        where: { id: publishJobId },
        data: {
          status: PublishJobStatus.FAILED,
          finishedAt: new Date(),
          error: errMessage,
          logs: logs.join("\n")
        }
      });
    }
  }
}

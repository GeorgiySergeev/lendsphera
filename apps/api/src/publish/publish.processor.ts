import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { LandingStatus, PublishJobStatus } from "@prisma/client";
import { Job } from "bullmq";
import { minify } from "html-minifier-terser";
import { transform } from "lightningcss";
import postcss from "postcss";
import type { AcceptedPlugin } from "postcss";
// @ts-expect-error: no types available for tailwindcss
import tailwindcss from "tailwindcss";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

import { env } from "../config/env";
import { PrismaService } from "../prisma/prisma.service";

interface PublishJobData {
  publishJobId: string;
  landingId: string;
  versionId: string;
}

@Processor("publishLanding")
export class PublishProcessor extends WorkerHost {
  private readonly logger = new Logger(PublishProcessor.name);
  private readonly s3Client: S3Client;

  constructor(private readonly prisma: PrismaService) {
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

      const version = landing.currentVersion;
      let html = version.html || "";

      log("Compiling Tailwind CSS...");
      const tailwindPlugin = tailwindcss as unknown as (
        options: Record<string, unknown>
      ) => AcceptedPlugin;
      const tailwindProcessor = postcss([
        tailwindPlugin({
          content: [{ raw: html, extension: "html" }],
          theme: { extend: {} },
          corePlugins: { preflight: true }
        })
      ]);
      const twResult = await tailwindProcessor.process(
        "@tailwind base;\n@tailwind components;\n@tailwind utilities;",
        {
          from: undefined
        }
      );
      let finalCss = twResult.css;

      log("Inlining custom CSS...");
      if (version.customCss) {
        finalCss += "\n" + version.customCss;
      }

      log("Minifying CSS...");
      const minifiedCss = transform({
        filename: "style.css",
        code: Buffer.from(finalCss),
        minify: true,
        sourceMap: false
      }).code.toString();

      html = html.replace("</head>", `<style>${minifiedCss}</style>\n</head>`);

      log("Injecting widget loader...");
      const widgetLoaderScript = `<script src="/widget-loader.js" async></script>`;
      html = html.replace("</body>", `${widgetLoaderScript}\n</body>`);

      log("Minifying HTML...");
      const minifiedHtml = await minify(html, {
        collapseWhitespace: true,
        removeComments: true,
        minifyJS: true,
        minifyCSS: true
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

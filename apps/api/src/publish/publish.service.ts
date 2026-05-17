import { InjectQueue } from "@nestjs/bullmq";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, PublishJobStatus, PublishTarget, VersionStatus } from "@prisma/client";
import { Queue } from "bullmq";
import { minify } from "html-minifier-terser";
import { transform } from "lightningcss";
import postcss from "postcss";
import type { AcceptedPlugin } from "postcss";
// @ts-expect-error: no types available for tailwindcss
import tailwindcss from "tailwindcss";

import type { AuthUser } from "../common/current-user.decorator";
import { mapPrismaError } from "../common/prisma-errors";
import { LandingContextResolver } from "../landings/landing-context.resolver";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PublishService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly landingContext: LandingContextResolver,
    @InjectQueue("publishLanding") private readonly publishQueue: Queue
  ) {}

  async enqueuePublishJob(landingId: string, user: AuthUser) {
    try {
      const contextSnapshot = await this.landingContext.resolve(landingId);

      return await this.prisma.$transaction(async (tx) => {
        const landing = await tx.landing.findUniqueOrThrow({
          where: { id: landingId },
          include: { currentVersion: true }
        });

        if (!landing.currentVersionId || !landing.currentVersion) {
          throw new BadRequestException("No draft exists to publish.");
        }

        const latest = await tx.version.findFirst({
          where: { landingId },
          orderBy: { versionNum: "desc" },
          select: { versionNum: true }
        });

        const publishVersion = await tx.version.create({
          data: {
            landingId,
            versionNum: (latest?.versionNum ?? 0) + 1,
            status: VersionStatus.PUBLISHED,
            grapesJson: landing.currentVersion.grapesJson ?? Prisma.JsonNull,
            placeholders:
              (contextSnapshot.placeholders as unknown as Prisma.InputJsonValue) ??
              Prisma.JsonNull,
            html: landing.currentVersion.html,
            css: landing.currentVersion.css,
            customCss: landing.currentVersion.customCss,
            customJs: landing.currentVersion.customJs,
            snapshotS3Key: landing.currentVersion.snapshotS3Key,
            snapshotSize: landing.currentVersion.snapshotSize,
            authorId: user.id,
            parentVersionId: landing.currentVersion.id,
            message: "Publish snapshot"
          }
        });

        await tx.landing.update({
          where: { id: landingId },
          data: { currentVersionId: publishVersion.id }
        });

        const job = await tx.publishJob.create({
          data: {
            landingId,
            versionId: publishVersion.id,
            target: PublishTarget.CLOUDFLARE_PAGES,
            status: PublishJobStatus.QUEUED,
            triggeredById: user.id
          }
        });

        await this.publishQueue.add(
          "publish",
          {
            publishJobId: job.id,
            landingId,
            versionId: publishVersion.id
          },
          { jobId: job.id }
        );

        return job;
      });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  getJobStatus(jobId: string) {
    return this.prisma.publishJob.findUniqueOrThrow({
      where: { id: jobId }
    });
  }

  async buildPreview(landingId: string) {
    const landing = await this.prisma.landing.findUniqueOrThrow({
      where: { id: landingId },
      include: { currentVersion: true }
    });

    if (!landing.currentVersion) {
      throw new NotFoundException("No current version found.");
    }

    const version = landing.currentVersion;
    let html = version.html || "";

    try {
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

      if (version.customCss) {
        finalCss += "\n" + version.customCss;
      }

      const cssBuffer = Buffer.from(finalCss);
      const minifiedCss = transform({
        filename: "style.css",
        code: cssBuffer,
        minify: true,
        sourceMap: false
      }).code.toString();

      html = html.replace("</head>", `<style>${minifiedCss}</style>\n</head>`);

      const widgetLoaderScript = `<script src="/widget-loader.js" async></script>`;
      html = html.replace("</body>", `${widgetLoaderScript}\n</body>`);

      const minifiedHtml = await minify(html, {
        collapseWhitespace: true,
        removeComments: true,
        minifyJS: true,
        minifyCSS: true
      });

      return { html: minifiedHtml };
    } catch (error) {
      throw new BadRequestException("Build preview failed: " + (error as Error).message);
    }
  }
}

import { InjectQueue } from "@nestjs/bullmq";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PublishJobStatus, PublishTarget } from "@prisma/client";
import { Queue } from "bullmq";
import { minify } from "html-minifier-terser";
import { transform } from "lightningcss";
import postcss from "postcss";
import type { AcceptedPlugin } from "postcss";
// @ts-expect-error: no types available for tailwindcss
import tailwindcss from "tailwindcss";

import type { AuthUser } from "../common/current-user.decorator";
import { mapPrismaError } from "../common/prisma-errors";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PublishService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue("publishLanding") private readonly publishQueue: Queue
  ) {}

  async enqueuePublishJob(landingId: string, user: AuthUser) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const landing = await tx.landing.findUniqueOrThrow({
          where: { id: landingId },
          include: { currentVersion: true }
        });

        if (!landing.currentVersionId) {
          throw new BadRequestException("No draft exists to publish.");
        }

        const job = await tx.publishJob.create({
          data: {
            landingId,
            versionId: landing.currentVersionId,
            target: PublishTarget.CLOUDFLARE_PAGES, // Using default
            status: PublishJobStatus.QUEUED,
            triggeredById: user.id
          }
        });

        await this.publishQueue.add(
          "publish",
          {
            publishJobId: job.id,
            landingId,
            versionId: landing.currentVersionId
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
      // 1. Compile Tailwind
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

      // 2. Inline customCss
      if (version.customCss) {
        finalCss += "\n" + version.customCss;
      }

      // 3. Minify CSS with lightningcss
      const cssBuffer = Buffer.from(finalCss);
      const minifiedCss = transform({
        filename: "style.css",
        code: cssBuffer,
        minify: true,
        sourceMap: false
      }).code.toString();

      // Inject CSS
      html = html.replace("</head>", `<style>${minifiedCss}</style>\n</head>`);

      // 4. Inject widget loader
      const widgetLoaderScript = `<script src="/widget-loader.js" async></script>`;
      html = html.replace("</body>", `${widgetLoaderScript}\n</body>`);

      // 5. Minify HTML
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

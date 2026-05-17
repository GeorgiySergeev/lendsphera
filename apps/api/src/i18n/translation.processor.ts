import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import { AuditAction } from "@prisma/client";
import { Job } from "bullmq";

import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { TRANSLATION_QUEUE, type TranslationJobData } from "./translation-queue.service";
import { createTranslationLlmProvider } from "./translation-llm.provider";

@Injectable()
@Processor(TRANSLATION_QUEUE)
export class TranslationProcessor extends WorkerHost {
  private readonly llm = createTranslationLlmProvider();

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {
    super();
  }

  async process(job: Job<TranslationJobData>): Promise<void> {
    const prompt = [
      `Translate the text from ${job.data.sourceLang} to ${job.data.targetLang}.`,
      "Return translation text only with no explanations.",
      job.data.context ? `Context: ${job.data.context}` : null,
      job.data.reviewFeedback ? `Reviewer feedback: ${job.data.reviewFeedback}` : null,
      `Source: ${job.data.sourceValue}`
    ]
      .filter(Boolean)
      .join("\n");

    const completion = await this.llm.complete({
      model: process.env.LLM_TRANSLATION_MODEL ?? "gpt-4o-mini",
      prompt,
      temperature: 0.2,
      maxTokens: 1024,
      timeoutMs: 15000
    });

    const value = completion.text.trim();
    if (!value) {
      throw new Error("Provider returned empty translation");
    }

    const existing = await this.prisma.i18nString.findUnique({
      where: { key_lang: { key: job.data.key, lang: job.data.targetLang } }
    });

    const updated = await this.prisma.i18nString.upsert({
      where: {
        key_lang: {
          key: job.data.key,
          lang: job.data.targetLang
        }
      },
      create: {
        key: job.data.key,
        lang: job.data.targetLang,
        value,
        context: job.data.context,
        source: "llm",
        isApproved: false
      },
      update: {
        value,
        context: job.data.context,
        source: "llm",
        isApproved: false
      }
    });

    await this.audit.log(AuditAction.UPDATE, "I18nString", updated.id, null, {
      diff: {
        op: "llm.translate",
        key: updated.key,
        lang: updated.lang,
        prevValue: existing?.value ?? null,
        nextValue: updated.value,
        reviewFeedback: job.data.reviewFeedback ?? null
      }
    });
  }
}

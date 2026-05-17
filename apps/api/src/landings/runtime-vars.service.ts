import { createHash, createHmac } from "node:crypto";

import { Injectable } from "@nestjs/common";
import type { RuntimeVars } from "@workspace/types";

import { env } from "../config/env";
import { LandingContextResolver } from "./landing-context.resolver";

type RuntimeVarsEnvelope = {
  payload: RuntimeVars;
  etag: string;
};

@Injectable()
export class RuntimeVarsService {
  private readonly maxAgeSeconds = 30;

  constructor(private readonly landingContext: LandingContextResolver) {}

  async getByLandingId(landingId: string): Promise<RuntimeVarsEnvelope> {
    const context = await this.landingContext.resolve(landingId);
    const now = new Date();
    const cachedUntil = new Date(now.getTime() + this.maxAgeSeconds * 1000).toISOString();
    const vars = this.composeVars(context);

    const payloadUnsigned = {
      cachedUntil,
      generatedAt: now.toISOString(),
      landingId: context.landingId,
      vars,
      versionId: context.versionId
    };
    const signature = createHmac("sha256", env.LS_BRIDGE_HMAC_SECRET)
      .update(JSON.stringify(payloadUnsigned))
      .digest("hex");

    const payload: RuntimeVars = {
      ...payloadUnsigned,
      signature
    };
    const etag = this.computeEtag(payload);

    return { etag, payload };
  }

  private composeVars(context: Awaited<ReturnType<LandingContextResolver["resolve"]>>) {
    const locale = this.toLocale(context.lang);
    const vars: RuntimeVars["vars"] = {
      LS_CTA: context.placeholders.CTA ?? context.placeholders.cta ?? "",
      LS_CURRENCY: context.currency ?? "",
      LS_DISCLAIMER:
        context.placeholders.DISCLAIMER ?? context.placeholders.disclaimer ?? "",
      LS_DISCOUNT: context.discount ?? "",
      LS_OLD_PRICE: this.formatMoney(context.oldPrice, locale),
      LS_PIXEL_ID: context.pixels?.pixelId ?? context.pixels?.facebookPixelId ?? "",
      LS_POSTBACK_URL: context.postbacks?.url ?? context.postbacks?.postbackUrl ?? "",
      LS_PRICE: this.formatMoney(context.price, locale),
      LS_PRODUCT_IMAGE: context.productImage ?? "",
      LS_PRODUCT_NAME: context.productName ?? ""
    };

    for (const [key, value] of Object.entries(context.placeholders)) {
      const trimmed = key.trim();
      if (!trimmed) continue;
      const namespaced = `LS_${trimmed}` as const;
      vars[namespaced] = value;
    }

    return vars;
  }

  private formatMoney(value: string | null, locale: string): string {
    if (!value) return "";
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return value;
    return new Intl.NumberFormat(locale, {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2
    }).format(parsed);
  }

  private toLocale(lang: string): string {
    if (lang.includes("-")) return lang;
    switch (lang.toLowerCase()) {
      case "de":
        return "de-DE";
      case "en":
        return "en-US";
      case "uk":
        return "uk-UA";
      case "ru":
        return "ru-RU";
      default:
        return "en-US";
    }
  }

  private computeEtag(payload: RuntimeVars): string {
    const digest = createHash("sha256").update(JSON.stringify(payload)).digest("hex");
    return `"${digest}"`;
  }
}

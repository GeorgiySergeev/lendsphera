import { createHash, createHmac } from "node:crypto";

import { Injectable } from "@nestjs/common";
import type { RuntimeVars } from "@workspace/types";

import { env } from "../config/env";
import { LandingContextResolver } from "./landing-context.resolver";
import { composeRuntimeVars } from "./runtime-vars.utils";

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
    const vars = composeRuntimeVars(context);

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
  private computeEtag(payload: RuntimeVars): string {
    const digest = createHash("sha256").update(JSON.stringify(payload)).digest("hex");
    return `"${digest}"`;
  }
}

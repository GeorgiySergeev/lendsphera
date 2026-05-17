import { createHmac, timingSafeEqual } from "node:crypto";

import { env } from "../config/env";

const PREVIEW_TOKEN_VERSION = 1;
const PREVIEW_TOKEN_TTL_SECONDS = 60 * 30;

type PreviewTokenPayload = {
  exp: number;
  geo: string;
  iat: number;
  landingId: string;
  slug: string;
  sub: string;
  v: number;
};

function createPreviewToken(input: {
  geo: string;
  landingId: string;
  slug: string;
  userId: string;
}) {
  const issuedAtSeconds = Math.floor(Date.now() / 1000);
  const payload: PreviewTokenPayload = {
    v: PREVIEW_TOKEN_VERSION,
    sub: input.userId,
    landingId: input.landingId,
    geo: input.geo.toLowerCase(),
    slug: input.slug,
    iat: issuedAtSeconds,
    exp: issuedAtSeconds + PREVIEW_TOKEN_TTL_SECONDS
  };
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signature = signPayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

function verifyPreviewToken(token: string | null) {
  if (!token) {
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return null;
  }

  const [encodedPayload, encodedSignature] = parts;
  const expectedSignature = signPayload(encodedPayload);
  if (!safeEqual(encodedSignature, expectedSignature)) {
    return null;
  }

  const payloadJson = decodeBase64Url(encodedPayload);
  if (!payloadJson) {
    return null;
  }

  let payload: PreviewTokenPayload;
  try {
    payload = JSON.parse(payloadJson) as PreviewTokenPayload;
  } catch {
    return null;
  }

  if (
    payload.v !== PREVIEW_TOKEN_VERSION ||
    typeof payload.exp !== "number" ||
    typeof payload.iat !== "number" ||
    typeof payload.sub !== "string" ||
    typeof payload.geo !== "string" ||
    typeof payload.slug !== "string" ||
    typeof payload.landingId !== "string"
  ) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp <= now) {
    return null;
  }

  return payload;
}

function signPayload(encodedPayload: string) {
  return createHmac("sha256", env.LS_BRIDGE_HMAC_SECRET)
    .update(encodedPayload)
    .digest("base64url");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string) {
  try {
    return Buffer.from(value, "base64url").toString("utf8");
  } catch {
    return null;
  }
}

export { createPreviewToken, PREVIEW_TOKEN_TTL_SECONDS, verifyPreviewToken };

import { createHmac, timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

type RevalidatePayload = {
  landingId: string;
  geo: string;
  slug: string;
  reason: "landing.published" | "landing.invalidated";
};

function isValidPayload(value: unknown): value is RevalidatePayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const input = value as Record<string, unknown>;

  return (
    typeof input.landingId === "string" &&
    input.landingId.length > 0 &&
    typeof input.geo === "string" &&
    input.geo.length > 0 &&
    typeof input.slug === "string" &&
    input.slug.length > 0 &&
    (input.reason === "landing.published" || input.reason === "landing.invalidated")
  );
}

function safeEquals(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) {
    return false;
  }

  return timingSafeEqual(left, right);
}

export async function POST(request: Request) {
  const secret =
    process.env.LS_BRIDGE_HMAC_SECRET || "dev-ls-bridge-hmac-secret-change-me";

  const signature = request.headers.get("x-ls-signature");
  if (!signature) {
    return NextResponse.json({ ok: false, error: "Missing signature" }, { status: 401 });
  }

  const rawBody = await request.text();
  const expectedSignature = createHmac("sha256", secret).update(rawBody).digest("hex");
  if (!safeEquals(signature, expectedSignature)) {
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isValidPayload(payload)) {
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  }

  const path = `/${payload.geo}/${payload.slug}`;
  revalidatePath(path);

  return NextResponse.json({
    ok: true,
    revalidated: path,
    reason: payload.reason,
    landingId: payload.landingId
  });
}

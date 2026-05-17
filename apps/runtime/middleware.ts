import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PREVIEW_QUERY_KEY = "preview";
const PREVIEW_COOKIE = "ls_preview_token";

export async function middleware(request: NextRequest) {
  const token = request.nextUrl.searchParams.get(PREVIEW_QUERY_KEY);

  if (!token) {
    return NextResponse.next();
  }

  const isValid = await verifyPreviewTokenForPath(
    token,
    request.nextUrl.pathname,
    process.env.LS_BRIDGE_HMAC_SECRET
  );
  if (!isValid) {
    const url = request.nextUrl.clone();
    url.searchParams.delete(PREVIEW_QUERY_KEY);
    const response = NextResponse.redirect(url);
    response.cookies.delete(PREVIEW_COOKIE);
    return response;
  }

  const url = request.nextUrl.clone();
  url.searchParams.delete(PREVIEW_QUERY_KEY);

  const response = NextResponse.redirect(url);
  response.cookies.set(PREVIEW_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 30
  });

  return response;
}

export const config = {
  matcher: ["/((?!_next|api|favicon.ico).*)"]
};

type PreviewTokenPayload = {
  exp: number;
  geo: string;
  slug: string;
};

async function verifyPreviewTokenForPath(
  token: string,
  pathname: string,
  secret: string | undefined
) {
  if (!secret) {
    return false;
  }

  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return false;
  }
  const [encodedPayload, encodedSignature] = parts;
  const expectedSignature = await signPayload(encodedPayload, secret);
  if (encodedSignature !== expectedSignature) {
    return false;
  }

  const payload = decodePayload(encodedPayload);
  if (!payload) {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp <= now) {
    return false;
  }

  const route = extractGeoSlug(pathname);
  if (!route) {
    return true;
  }

  return (
    payload.geo.toLowerCase() === route.geo.toLowerCase() && payload.slug === route.slug
  );
}

async function signPayload(encodedPayload: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(encodedPayload)
  );

  return bufferToBase64Url(signature);
}

function decodePayload(encodedPayload: string): PreviewTokenPayload | null {
  try {
    const text = new TextDecoder().decode(base64UrlToBytes(encodedPayload));
    const parsed = JSON.parse(text) as Partial<PreviewTokenPayload>;
    if (
      typeof parsed.exp !== "number" ||
      typeof parsed.geo !== "string" ||
      typeof parsed.slug !== "string"
    ) {
      return null;
    }
    return { exp: parsed.exp, geo: parsed.geo, slug: parsed.slug };
  } catch {
    return null;
  }
}

function extractGeoSlug(pathname: string): { geo: string; slug: string } | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length < 2) {
    return null;
  }
  return { geo: parts[0] ?? "", slug: parts[1] ?? "" };
}

function base64UrlToBytes(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function bufferToBase64Url(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i] ?? 0);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

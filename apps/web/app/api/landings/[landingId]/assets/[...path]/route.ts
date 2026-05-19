import { NextResponse } from "next/server";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

type RouteContext = {
  params: Promise<{
    landingId: string;
    path: string[];
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { landingId, path } = await context.params;
  const assetPath = path.map((segment) => encodeURIComponent(segment)).join("/");
  const token = new URL(request.url).searchParams.get("token");

  if (!token) {
    return new NextResponse("Editor asset token is required.", { status: 401 });
  }

  const upstream = await fetch(
    `${apiBaseUrl}/landings/${encodeURIComponent(landingId)}/imported-assets/${assetPath}?token=${encodeURIComponent(token)}`,
    {
      cache: "no-store"
    }
  );

  if (!upstream.ok) {
    return new NextResponse(await upstream.text(), { status: upstream.status });
  }

  const headers = new Headers();
  const contentType = upstream.headers.get("content-type");
  const cacheControl = upstream.headers.get("cache-control");

  if (contentType) {
    headers.set("content-type", contentType);
  }

  if (cacheControl) {
    headers.set("cache-control", cacheControl);
  }

  headers.set("cross-origin-resource-policy", "cross-origin");

  return new NextResponse(await upstream.arrayBuffer(), {
    status: upstream.status,
    headers
  });
}

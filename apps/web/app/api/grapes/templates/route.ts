import { NextResponse } from "next/server";

import { readPlatformApiKey } from "./_lib";

const platformApiUrl = "https://api.grapesjs.com/v1/templates";

export async function GET(request: Request) {
  const apiKey = await readPlatformApiKey();

  if (!apiKey) {
    return NextResponse.json({ items: [], missingApiKey: true }, { status: 200 });
  }

  const { searchParams } = new URL(request.url);
  const source = searchParams.get("source") ?? "all";
  const type = searchParams.get("type") ?? "web";
  const url = `${platformApiUrl}?source=${encodeURIComponent(source)}&type=${encodeURIComponent(type)}`;

  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${apiKey}`
    }
  });

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}

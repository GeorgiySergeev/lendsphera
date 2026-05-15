import { NextResponse } from "next/server";

import { readPlatformApiKey } from "../_lib";

type RouteContext = {
  params: Promise<{ templateId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const apiKey = await readPlatformApiKey();

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing GRAPES_PLATFORM_API_KEY" },
      { status: 503 }
    );
  }

  const { templateId } = await context.params;
  const response = await fetch(
    `https://api.grapesjs.com/v1/templates/${encodeURIComponent(templateId)}?withProjectData=true`,
    {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${apiKey}`
      }
    }
  );

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}

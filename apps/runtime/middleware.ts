import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PREVIEW_QUERY_KEY = "preview";
const PREVIEW_COOKIE = "ls_preview_token";

export function middleware(request: NextRequest) {
  const token = request.nextUrl.searchParams.get(PREVIEW_QUERY_KEY);

  if (!token) {
    return NextResponse.next();
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

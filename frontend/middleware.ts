import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PREFIXES = ["/login", "/onboarding", "/_next", "/favicon.ico"];
const PUBLIC_FILE = /\.[^/]+$/;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api") || PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix)) || PUBLIC_FILE.test(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get("admanagement_session")?.value;
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api).*)"],
};

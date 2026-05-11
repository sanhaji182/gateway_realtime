import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/session";

// Public paths — anyone can access (landing, login, docs)
const PUBLIC_PATHS = ["/_not-found"];

export function proxy(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const path = req.nextUrl.pathname;

  // Landing page / is always public
  if (path === "/" || path === "/login" || path.startsWith("/docs")) {
    return NextResponse.next();
  }

  // Static assets, API, Next.js internals — pass through
  if (path.startsWith("/_next") || path.startsWith("/api") || path.startsWith("/favicon")) {
    return NextResponse.next();
  }

  // Everything else requires auth
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

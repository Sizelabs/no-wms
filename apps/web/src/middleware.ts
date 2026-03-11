import { type NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";

import { routing } from "./i18n/routing";
import { updateSession } from "./lib/supabase/middleware";

const intlMiddleware = createIntlMiddleware(routing);

// Paths that don't require authentication
const publicPaths = ["/login", "/signup", "/forgot-password", "/set-password"];

function isPublicPath(pathname: string): boolean {
  // Strip locale prefix (e.g., /es/login → /login)
  const segments = pathname.split("/").filter(Boolean);
  const locales = routing.locales as readonly string[];
  const pathWithoutLocale =
    segments.length > 0 && locales.includes(segments[0]!)
      ? "/" + segments.slice(1).join("/")
      : pathname;

  return (
    publicPaths.some((p) => pathWithoutLocale.startsWith(p)) ||
    pathWithoutLocale === "/" ||
    pathWithoutLocale === ""
  );
}

export default async function middleware(request: NextRequest) {
  // Skip intl middleware for the auth callback route (no locale prefix)
  if (request.nextUrl.pathname.startsWith("/auth/")) {
    return NextResponse.next();
  }

  // 1. Run intl middleware first (handles locale routing)
  const intlResponse = intlMiddleware(request);

  // 2. Skip auth for prefetch requests — they don't need session validation,
  //    and skipping saves a network round-trip per visible link.
  const isPrefetch = request.headers.get("next-router-prefetch") === "1"
    || request.headers.get("purpose") === "prefetch";
  if (isPrefetch) {
    return intlResponse;
  }

  // 3. Run Supabase session refresh
  const { user, response } = await updateSession(request, intlResponse);

  // 4. Check auth for protected routes
  const { pathname } = request.nextUrl;

  if (!user && !isPublicPath(pathname)) {
    // Redirect to login
    const locale = pathname.split("/")[1] || routing.defaultLocale;
    const loginUrl = new URL(`/${locale}/login`, request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!monitoring|api|_next|_vercel|.*\\..*).*)"],
};

import { type NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";

import { routing } from "./i18n/routing";
import { updateSession } from "./lib/supabase/middleware";

const intlMiddleware = createIntlMiddleware(routing);

// Paths that don't require authentication
const publicPaths = ["/login", "/signup", "/forgot-password", "/set-password"];

/** Strip locale prefix and return resolved locale + remaining path. */
function stripLocale(pathname: string): { locale: string; path: string } {
  const segments = pathname.split("/").filter(Boolean);
  const locales = routing.locales as readonly string[];
  if (segments.length > 0 && locales.includes(segments[0]!)) {
    return { locale: segments[0]!, path: "/" + segments.slice(1).join("/") };
  }
  return { locale: routing.defaultLocale, path: pathname };
}

function isPublicPath(pathname: string): boolean {
  const { path } = stripLocale(pathname);
  return (
    publicPaths.some((p) => path.startsWith(p)) ||
    path === "/" ||
    path === ""
  );
}

export default async function middleware(request: NextRequest) {
  // Skip intl middleware for the auth callback route (no locale prefix)
  if (request.nextUrl.pathname.startsWith("/auth/")) {
    return NextResponse.next();
  }

  // 1. Run intl middleware first (handles locale routing)
  const intlResponse = intlMiddleware(request);

  // 2. Run Supabase session refresh
  const { user, response } = await updateSession(request, intlResponse);

  // 3. Check auth for protected routes
  const { pathname } = request.nextUrl;
  const { locale, path } = stripLocale(pathname);

  if (!user && !isPublicPath(pathname)) {
    // Redirect to login
    const loginUrl = new URL(`/${locale}/login`, request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 4. Authenticated users at root → redirect to dashboard home
  if (user && (path === "/" || path === "")) {
    return NextResponse.redirect(new URL(`/${locale}/home`, request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!monitoring|api|_next|_vercel|.*\\..*).*)"],
};

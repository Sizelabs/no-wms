import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";

export async function updateSession(
  request: NextRequest,
  response: NextResponse,
) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // Use getSession() instead of getUser() for fast middleware.
  // getSession() reads from the JWT cookie locally (~0ms) and only makes a
  // network call when the token needs refresh (rare during active sessions).
  // The real token validation happens in getAuthContext() via getUser().
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return { user: session?.user ?? null, response };
}

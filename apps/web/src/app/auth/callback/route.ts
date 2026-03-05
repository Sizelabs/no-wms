import { type NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Supabase redirects here after the user clicks an email link
 * (invite, magic-link, password recovery, etc.).
 *
 * For PKCE flow: we exchange the code for a session, then redirect.
 * For implicit flow (hash fragment): AuthHashHandler in the locale
 * layout handles session establishment client-side.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const code = searchParams.get("code");
  const locale = "es";

  const supabase = await createClient();

  if (code) {
    // PKCE flow — exchange code for session
    await supabase.auth.exchangeCodeForSession(code);
  } else if (token_hash && type) {
    // OTP / invite / recovery flow
    await supabase.auth.verifyOtp({
      token_hash,
      type: type as "invite" | "recovery" | "email",
    });
  }

  // This callback is only reached via email links (invite, magic-link,
  // recovery). In all cases the user should set or confirm their password.
  // The set-password page redirects to login if there's no session.
  return NextResponse.redirect(
    new URL(`/${locale}/set-password`, request.url),
  );
}

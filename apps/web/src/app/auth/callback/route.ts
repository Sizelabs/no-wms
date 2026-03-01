import { type NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Supabase redirects here after the user clicks an email link
 * (invite, magic-link, password recovery, etc.).
 * We exchange the code/token_hash for a session, then redirect
 * to the appropriate page.
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

  // After exchanging, the user has a valid session.
  // If this was an invite, send them to set their password.
  if (type === "invite" || type === "recovery") {
    return NextResponse.redirect(
      new URL(`/${locale}/set-password`, request.url),
    );
  }

  // For other types (email confirmation, etc.), go to dashboard
  return NextResponse.redirect(new URL(`/${locale}`, request.url));
}

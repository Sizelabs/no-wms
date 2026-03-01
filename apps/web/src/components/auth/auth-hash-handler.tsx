"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

import { createClient } from "@/lib/supabase/client";

/**
 * Detects Supabase auth tokens in the URL hash fragment
 * (e.g. #access_token=...&type=invite) and exchanges them
 * for a session. Redirects invited users to /set-password.
 */
export function AuthHashHandler() {
  const router = useRouter();
  const { locale } = useParams<{ locale: string }>();

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || !hash.includes("access_token")) return;

    const params = new URLSearchParams(hash.substring(1));
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const type = params.get("type");

    if (!accessToken || !refreshToken) return;

    const supabase = createClient();

    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        if (error) {
          console.error("Failed to set session from invite:", error.message);
          return;
        }

        // Clear the hash from the URL
        window.history.replaceState(null, "", window.location.pathname);

        if (type === "invite" || type === "recovery") {
          router.replace(`/${locale}/set-password`);
        } else {
          router.replace(`/${locale}`);
        }
      });
  }, [locale, router]);

  return null;
}

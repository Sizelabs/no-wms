import { createClient } from "@supabase/supabase-js";

/**
 * Supabase admin client using the service-role key.
 * Use ONLY in server actions / route handlers — never expose to the browser.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

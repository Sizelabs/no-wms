import type { Role } from "@no-wms/shared/constants/roles";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Fetch a user's roles from the user_roles table (source of truth).
 * Falls back to ["agency"] if no roles are found.
 */
export async function getUserRoles(
  supabase: SupabaseClient,
  userId: string,
): Promise<Role[]> {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (data?.length) {
    return data.map((r) => r.role as Role);
  }

  return ["agency"];
}

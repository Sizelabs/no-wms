import { cache } from "react";

import type { UserRoleAssignment } from "./roles";
import { getUserRoleAssignments } from "./roles";
import { createClient } from "@/lib/supabase/server";

/**
 * Per-request cached auth user — deduplicates the supabase.auth.getUser()
 * network round-trip across layout, page, and same-request server calls.
 */
export const getAuthUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/**
 * Per-request cached role assignments — deduplicates the user_roles query.
 */
export const getCachedRoleAssignments = cache(
  async (): Promise<UserRoleAssignment[]> => {
    const user = await getAuthUser();
    if (!user) return [];
    const supabase = await createClient();
    return getUserRoleAssignments(supabase, user.id);
  },
);

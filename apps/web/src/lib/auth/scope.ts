import { getUserRoleAssignments, getScopedWarehouseIds } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

/**
 * Server-side helper: returns the warehouse IDs the current user is scoped to.
 * - Returns null for unscoped users (super_admin, company_admin) → sees all warehouses.
 * - Returns string[] for warehouse-scoped users.
 * - Returns [] (empty array) if user is not authenticated, which effectively shows nothing.
 */
export async function getUserWarehouseScope(): Promise<string[] | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const assignments = await getUserRoleAssignments(supabase, user.id);
  return getScopedWarehouseIds(assignments);
}

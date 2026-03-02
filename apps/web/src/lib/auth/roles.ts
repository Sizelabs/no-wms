import type { Role } from "@no-wms/shared/constants/roles";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface UserRoleAssignment {
  role: Role;
  warehouse_id: string | null;
  agency_id: string | null;
}

/** Roles that can see all warehouses and all agencies */
const UNSCOPED_ROLES: Role[] = ["super_admin", "company_admin"];

/** Roles scoped to a specific agency */
const AGENCY_ROLES: Role[] = ["agency"];

/**
 * Fetch a user's role assignments (role + scope) from the user_roles table.
 * Falls back to a single "agency" assignment if no roles are found.
 */
export async function getUserRoleAssignments(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserRoleAssignment[]> {
  const { data } = await supabase
    .from("user_roles")
    .select("role, warehouse_id, agency_id")
    .eq("user_id", userId);

  if (data?.length) {
    return data.map((r) => ({
      role: r.role as Role,
      warehouse_id: r.warehouse_id as string | null,
      agency_id: r.agency_id as string | null,
    }));
  }

  return [{ role: "agency", warehouse_id: null, agency_id: null }];
}

/**
 * Extract unique warehouse IDs from role assignments.
 * Returns null for unscoped users (super_admin, company_admin) meaning "all warehouses".
 * Returns string[] for warehouse-scoped users.
 */
export function getScopedWarehouseIds(
  assignments: UserRoleAssignment[],
): string[] | null {
  const hasUnscopedRole = assignments.some((a) =>
    UNSCOPED_ROLES.includes(a.role),
  );

  if (hasUnscopedRole) {
    return null;
  }

  const ids = assignments
    .map((a) => a.warehouse_id)
    .filter((id): id is string => id != null);

  return [...new Set(ids)];
}

/**
 * Extract unique agency IDs from role assignments.
 * Returns null for non-agency users (they don't filter by agency).
 * Returns string[] for agency-scoped users.
 */
export function getScopedAgencyIds(
  assignments: UserRoleAssignment[],
): string[] | null {
  const hasNonAgencyRole = assignments.some(
    (a) => !AGENCY_ROLES.includes(a.role),
  );

  if (hasNonAgencyRole) {
    return null;
  }

  const ids = assignments
    .map((a) => a.agency_id)
    .filter((id): id is string => id != null);

  return [...new Set(ids)];
}

/**
 * Fetch a user's roles from the user_roles table (source of truth).
 * Falls back to ["agency"] if no roles are found.
 */
export async function getUserRoles(
  supabase: SupabaseClient,
  userId: string,
): Promise<Role[]> {
  const assignments = await getUserRoleAssignments(supabase, userId);
  return assignments.map((a) => a.role);
}

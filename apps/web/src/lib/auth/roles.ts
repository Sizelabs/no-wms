import type { Role } from "@no-wms/shared/constants/roles";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface UserRoleAssignment {
  role: Role;
  warehouse_id: string | null;
  courier_id: string | null;
  agency_id: string | null;
}

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
    .select("role, warehouse_id, courier_id, agency_id")
    .eq("user_id", userId);

  if (data?.length) {
    return data.map((r) => ({
      role: r.role as Role,
      warehouse_id: r.warehouse_id as string | null,
      courier_id: r.courier_id as string | null,
      agency_id: r.agency_id as string | null,
    }));
  }

  return [{ role: "agency", warehouse_id: null, courier_id: null, agency_id: null }];
}

/** Roles that don't filter by warehouse (they filter by agency or destination instead, or not at all) */
const WAREHOUSE_UNSCOPED_ROLES: Role[] = [
  "super_admin",
  "forwarder_admin",
  "agency",
  "destination_admin",
  "destination_operator",
];

/**
 * Extract unique warehouse IDs from role assignments.
 * Returns null for unscoped users (super_admin, forwarder_admin, agency) meaning "all warehouses".
 * Returns string[] for warehouse-scoped users.
 */
export function getScopedWarehouseIds(
  assignments: UserRoleAssignment[],
): string[] | null {
  const hasUnscopedRole = assignments.some((a) =>
    WAREHOUSE_UNSCOPED_ROLES.includes(a.role),
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

/** Roles scoped to a specific courier */
const COURIER_SCOPED_ROLES: Role[] = ["destination_admin", "destination_operator"];

/**
 * Extract unique courier IDs from role assignments.
 * Returns null for non-courier-scoped users (they don't filter by courier).
 * Returns string[] for destination roles scoped to specific couriers.
 */
export function getScopedCourierIds(
  assignments: UserRoleAssignment[],
): string[] | null {
  const hasNonCourierRole = assignments.some(
    (a) => !COURIER_SCOPED_ROLES.includes(a.role),
  );

  if (hasNonCourierRole) {
    return null;
  }

  const ids = assignments
    .map((a) => a.courier_id)
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

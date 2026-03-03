import type { UserRoleAssignment } from "@/lib/auth/roles";
import { getScopedAgencyIds, getScopedCourrierIds, getScopedWarehouseIds, getUserRoleAssignments } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

interface UserScope {
  warehouseIds: string[] | null;
  courrierIds: string[] | null;
  agencyIds: string[] | null;
}

/**
 * Server-side helper: fetches role assignments once and derives both scopes.
 */
async function getUserScopes(): Promise<{ assignments: UserRoleAssignment[] | null }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { assignments: null };
  }

  const assignments = await getUserRoleAssignments(supabase, user.id);
  return { assignments };
}

/**
 * Server-side helper: returns the warehouse IDs the current user is scoped to.
 * - Returns null for unscoped users (super_admin, company_admin) → sees all warehouses.
 * - Returns string[] for warehouse-scoped users.
 * - Returns [] (empty array) if user is not authenticated, which effectively shows nothing.
 */
export async function getUserWarehouseScope(): Promise<string[] | null> {
  const { assignments } = await getUserScopes();
  if (!assignments) return [];
  return getScopedWarehouseIds(assignments);
}

/**
 * Server-side helper: returns the courrier IDs the current user is scoped to.
 * - Returns null for non-destination users → sees all courriers.
 * - Returns string[] for destination-scoped users.
 * - Returns [] if user is not authenticated.
 */
export async function getUserCourrierScope(): Promise<string[] | null> {
  const { assignments } = await getUserScopes();
  if (!assignments) return [];
  return getScopedCourrierIds(assignments);
}

/**
 * Server-side helper: returns the agency IDs the current user is scoped to.
 * - Returns null for non-agency users → sees all agencies / all WRs.
 * - Returns string[] for agency-scoped users.
 * - Returns [] if user is not authenticated.
 */
export async function getUserAgencyScope(): Promise<string[] | null> {
  const { assignments } = await getUserScopes();
  if (!assignments) return [];
  return getScopedAgencyIds(assignments);
}

/**
 * Returns warehouse, courrier, and agency scopes in a single call (avoids duplicate DB queries).
 */
export async function getUserFullScope(): Promise<UserScope> {
  const { assignments } = await getUserScopes();
  if (!assignments) return { warehouseIds: [], courrierIds: [], agencyIds: [] };
  return {
    warehouseIds: getScopedWarehouseIds(assignments),
    courrierIds: getScopedCourrierIds(assignments),
    agencyIds: getScopedAgencyIds(assignments),
  };
}

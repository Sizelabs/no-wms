import type { RolePermissionMap } from "@no-wms/shared/constants/permissions";
import type { Role } from "@no-wms/shared/constants/roles";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { cache } from "react";

import { getRolePermissions } from "@/lib/actions/permissions";
import type { UserRoleAssignment } from "@/lib/auth/roles";
import { getScopedAgencyIds, getScopedCourierIds, getScopedWarehouseIds, getUserRoleAssignments } from "@/lib/auth/roles";
import { getPrimaryRole } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";

export interface AuthContext {
  user: User;
  supabase: SupabaseClient;
  assignments: UserRoleAssignment[];
  roles: Role[];
  primaryRole: Role;
  permissions: RolePermissionMap;
  warehouseIds: string[] | null;
  courierIds: string[] | null;
  agencyIds: string[] | null;
}

/**
 * Cached auth context — deduplicates all auth/role/permission/scope calls
 * within a single React server render pass via `cache()`.
 *
 * Returns `null` if the user is not authenticated.
 */
export const getAuthContext = cache(async (): Promise<AuthContext | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const assignments = await getUserRoleAssignments(supabase, user.id);
  const roles = assignments.map((a) => a.role);
  const primaryRole = getPrimaryRole(roles);
  const permissions = await getRolePermissions(primaryRole);

  return {
    user,
    supabase,
    assignments,
    roles,
    primaryRole,
    permissions,
    warehouseIds: getScopedWarehouseIds(assignments),
    courierIds: getScopedCourierIds(assignments),
    agencyIds: getScopedAgencyIds(assignments),
  };
});

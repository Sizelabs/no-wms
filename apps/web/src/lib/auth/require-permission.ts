import type { Permission, Resource, RolePermissionMap } from "@no-wms/shared/constants/permissions";
import type { Role } from "@no-wms/shared/constants/roles";
import { redirect } from "next/navigation";

import { getRolePermissions } from "@/lib/actions/permissions";
import { getPrimaryRole } from "@/lib/navigation";

import { getAuthUser, getCachedRoleAssignments } from "./cached";

export async function requirePermission(
  locale: string,
  resource: Resource,
  permission: Permission,
): Promise<{ userId: string; roles: Role[]; permissions: RolePermissionMap }> {
  const user = await getAuthUser();
  if (!user) redirect(`/${locale}/login`);

  const assignments = await getCachedRoleAssignments();
  const roles = assignments.map((a) => a.role);
  const primaryRole = getPrimaryRole(roles);
  const permissions = await getRolePermissions(primaryRole);

  if (!permissions[resource][permission]) {
    redirect(`/${locale}`);
  }

  return { userId: user.id, roles, permissions };
}

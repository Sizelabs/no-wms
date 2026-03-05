import type { Permission, Resource, RolePermissionMap } from "@no-wms/shared/constants/permissions";
import type { Role } from "@no-wms/shared/constants/roles";
import { redirect } from "next/navigation";

import { getRolePermissions } from "@/lib/actions/permissions";
import { getUserRoles } from "@/lib/auth/roles";
import { getPrimaryRole } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requirePermission(
  locale: string,
  resource: Resource,
  permission: Permission,
): Promise<{ userId: string; roles: Role[]; permissions: RolePermissionMap }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const roles = await getUserRoles(supabase, user.id);
  const primaryRole = getPrimaryRole(roles);
  const permissions = await getRolePermissions(primaryRole);

  if (!permissions[resource][permission]) {
    redirect(`/${locale}`);
  }

  return { userId: user.id, roles, permissions };
}

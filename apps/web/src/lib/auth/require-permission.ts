import type { Permission, Resource, RolePermissionMap } from "@no-wms/shared/constants/permissions";
import type { Role } from "@no-wms/shared/constants/roles";
import { redirect } from "next/navigation";

import { getAuthContext } from "@/lib/auth/context";

export async function requirePermission(
  locale: string,
  resource: Resource,
  permission: Permission,
): Promise<{ userId: string; roles: Role[]; permissions: RolePermissionMap }> {
  const ctx = await getAuthContext();
  if (!ctx) redirect(`/${locale}/login`);

  if (!ctx.permissions[resource][permission]) {
    redirect(`/${locale}`);
  }

  return { userId: ctx.user.id, roles: ctx.roles, permissions: ctx.permissions };
}

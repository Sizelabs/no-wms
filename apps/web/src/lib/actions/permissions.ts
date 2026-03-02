"use server";

import type { Resource, RolePermissionMap } from "@no-wms/shared/constants/permissions";
import { DEFAULT_PERMISSIONS, RESOURCES } from "@no-wms/shared/constants/permissions";
import type { Role } from "@no-wms/shared/constants/roles";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

interface DbRow {
  role: string;
  resource: string;
  can_create: boolean;
  can_read: boolean;
  can_update: boolean;
  can_delete: boolean;
}

function mergeWithDefaults(role: Role, rows: DbRow[]): RolePermissionMap {
  const defaults = DEFAULT_PERMISSIONS[role];
  const map = { ...defaults };

  for (const r of RESOURCES) {
    map[r] = { ...defaults[r] };
  }

  for (const row of rows) {
    const resource = row.resource as Resource;
    if (RESOURCES.includes(resource)) {
      map[resource] = {
        create: row.can_create,
        read: row.can_read,
        update: row.can_update,
        delete: row.can_delete,
      };
    }
  }

  return map;
}

export async function getRolePermissions(role: Role): Promise<RolePermissionMap> {
  if (role === "super_admin") {
    return DEFAULT_PERMISSIONS.super_admin;
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("role_permissions")
    .select("role, resource, can_create, can_read, can_update, can_delete")
    .eq("role", role);

  return mergeWithDefaults(role, (data as DbRow[] | null) ?? []);
}

export async function getAllRolePermissions(): Promise<Record<Role, RolePermissionMap>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("role_permissions")
    .select("role, resource, can_create, can_read, can_update, can_delete");

  const rows = (data as DbRow[] | null) ?? [];
  const byRole: Record<string, DbRow[]> = {};
  for (const row of rows) {
    const arr = byRole[row.role] ?? (byRole[row.role] = []);
    arr.push(row);
  }

  const result = {} as Record<Role, RolePermissionMap>;
  for (const role of Object.keys(DEFAULT_PERMISSIONS) as Role[]) {
    result[role] = role === "super_admin"
      ? DEFAULT_PERMISSIONS.super_admin
      : mergeWithDefaults(role, byRole[role] ?? []);
  }

  return result;
}

export async function saveRolePermission(
  role: Role,
  resource: Resource,
  perms: { create: boolean; read: boolean; update: boolean; delete: boolean },
): Promise<{ error?: string }> {
  if (role === "super_admin") {
    return { error: "No se pueden modificar los permisos de super_admin" };
  }

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { error } = await supabase
    .from("role_permissions")
    .upsert(
      {
        role,
        resource,
        can_create: perms.create,
        can_read: perms.read,
        can_update: perms.update,
        can_delete: perms.delete,
        updated_by: user.id,
      },
      { onConflict: "role,resource" },
    );

  if (error) return { error: error.message };

  revalidatePath("/settings");
  return {};
}

export async function resetRolePermissions(role: Role): Promise<{ error?: string }> {
  if (role === "super_admin") {
    return { error: "No se pueden modificar los permisos de super_admin" };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("role_permissions")
    .delete()
    .eq("role", role);

  if (error) return { error: error.message };

  revalidatePath("/settings");
  return {};
}

"use server";

import type { Role } from "@no-wms/shared/constants/roles";
import { revalidatePath } from "next/cache";

import { getUserRoles } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const ADMIN_ROLES: Role[] = ["super_admin", "forwarder_admin"];

/**
 * Verify the current user has admin privileges (super_admin or forwarder_admin).
 * Returns the caller's roles and organization_id, or an error.
 */
async function requireUserAdmin(): Promise<
  { ok: true; roles: Role[]; orgId: string | null; userId: string } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado" };

  const roles = await getUserRoles(supabase, user.id);
  if (!roles.some((r) => ADMIN_ROLES.includes(r))) {
    return { ok: false, error: "Sin permisos" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  return { ok: true, roles, orgId: profile?.organization_id ?? null, userId: user.id };
}

export async function getCourierUsers(courierId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("*, user_roles!inner(*)")
    .eq("user_roles.courier_id", courierId)
    .in("user_roles.role", ["destination_admin", "destination_operator"])
    .order("full_name");

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function getAgencyUsers(agencyId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("*, user_roles!inner(*)")
    .eq("user_roles.agency_id", agencyId)
    .eq("user_roles.role", "agency")
    .order("full_name");

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function getUsers() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("*, user_roles(*)")
    .order("full_name");

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * Fetch ALL users with their organization, courier, and agency info.
 * Used by super_admin to see all platform users grouped by entity.
 */
export async function getAllUsersGrouped() {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("profiles")
    .select(
      "*, user_roles(*, couriers(id, name), agencies(id, name)), organizations(id, name)",
    )
    .order("full_name");

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function getUser(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("*, user_roles(*)")
    .eq("id", id)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function updateUserProfile(
  id: string,
  formData: FormData,
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: formData.get("full_name") as string,
      phone: (formData.get("phone") as string) || null,
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/settings");
  revalidatePath("/settings/forwarders");
  revalidatePath("/settings/users");
}

export async function assignRole(formData: FormData): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from("user_roles").insert({
    user_id: formData.get("user_id") as string,
    organization_id: formData.get("organization_id") as string,
    role: formData.get("role") as string,
    warehouse_id: (formData.get("warehouse_id") as string) || null,
    destination_id:
      (formData.get("destination_id") as string) || null,
    agency_id: (formData.get("agency_id") as string) || null,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/settings");
  revalidatePath("/settings/forwarders");
  revalidatePath("/settings/users");
}

export async function removeRole(roleId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("user_roles")
    .delete()
    .eq("id", roleId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/settings");
  revalidatePath("/settings/forwarders");
  revalidatePath("/settings/users");
}

/**
 * Invite a new user to an organization. Creates the auth user,
 * profile, and assigns the specified role.
 */
export async function inviteUser(
  organizationId: string,
  fullName: string,
  email: string,
  role: string,
  opts?: { warehouse_id?: string; courier_id?: string; agency_id?: string },
): Promise<{ error: string } | null> {
  const admin = createAdminClient();

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const { data: authData, error: authError } =
    await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName },
      redirectTo: `${siteUrl}/auth/callback`,
    });

  if (authError) {
    return { error: authError.message };
  }

  const userId = authData.user.id;

  const { error: profileError } = await admin.from("profiles").insert({
    id: userId,
    organization_id: organizationId,
    full_name: fullName,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(userId);
    return { error: profileError.message };
  }

  const { error: roleError } = await admin.from("user_roles").insert({
    user_id: userId,
    organization_id: organizationId,
    role,
    warehouse_id: opts?.warehouse_id || null,
    courier_id: opts?.courier_id || null,
    agency_id: opts?.agency_id || null,
  });

  if (roleError) {
    await admin.auth.admin.deleteUser(userId);
    return { error: roleError.message };
  }

  revalidatePath("/settings");
  revalidatePath("/settings/forwarders");
  revalidatePath("/settings/users");
  return null;
}

/**
 * Resend the invite email to a user who hasn't set their password yet.
 * Uses signInWithOtp which reliably sends an email to existing users
 * (inviteUserByEmail/generateLink reject existing users, and
 * auth.resend silently skips invited users).
 */
export async function resendInvite(
  userId: string,
): Promise<{ error: string } | null> {
  const auth = await requireUserAdmin();
  if (!auth.ok) return { error: auth.error };

  const admin = createAdminClient();

  // Verify target is in same org (unless super_admin)
  const { data: targetProfile } = await admin
    .from("profiles")
    .select("organization_id")
    .eq("id", userId)
    .single();

  if (!targetProfile) return { error: "Usuario no encontrado" };
  if (!auth.roles.includes("super_admin") && targetProfile.organization_id !== auth.orgId) {
    return { error: "Sin permisos" };
  }

  const { data: authUser, error: fetchError } =
    await admin.auth.admin.getUserById(userId);

  if (fetchError || !authUser.user?.email) {
    return { error: fetchError?.message ?? "Usuario no encontrado" };
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const { error } = await admin.auth.signInWithOtp({
    email: authUser.user.email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${siteUrl}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/settings/users");
  revalidatePath("/settings/forwarders");
  return null;
}

/**
 * Send a password reset email to a user.
 */
export async function resetUserPassword(
  userId: string,
): Promise<{ error: string } | null> {
  const auth = await requireUserAdmin();
  if (!auth.ok) return { error: auth.error };

  const admin = createAdminClient();

  // Verify target is in same org (unless super_admin)
  const { data: targetProfile } = await admin
    .from("profiles")
    .select("organization_id")
    .eq("id", userId)
    .single();

  if (!targetProfile) return { error: "Usuario no encontrado" };
  if (!auth.roles.includes("super_admin") && targetProfile.organization_id !== auth.orgId) {
    return { error: "Sin permisos" };
  }

  const { data: authUser, error: fetchError } =
    await admin.auth.admin.getUserById(userId);

  if (fetchError || !authUser.user?.email) {
    return { error: fetchError?.message ?? "Usuario no encontrado" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(
    authUser.user.email,
    {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback`,
    },
  );

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/settings/users");
  revalidatePath("/settings/forwarders");
  return null;
}

/**
 * Toggle a user's is_active status.
 */
export async function toggleUserActive(
  userId: string,
  isActive: boolean,
): Promise<{ error: string } | null> {
  const auth = await requireUserAdmin();
  if (!auth.ok) return { error: auth.error };

  const admin = createAdminClient();

  // Verify target is in same org (unless super_admin)
  const { data: targetProfile } = await admin
    .from("profiles")
    .select("organization_id, user_roles(role)")
    .eq("id", userId)
    .single();

  if (!targetProfile) return { error: "Usuario no encontrado" };
  if (!auth.roles.includes("super_admin")) {
    if (targetProfile.organization_id !== auth.orgId) {
      return { error: "Sin permisos" };
    }
    // Prevent forwarder_admin from disabling super_admin users
    const targetRoles = (targetProfile.user_roles as { role: string }[]) ?? [];
    if (targetRoles.some((r) => r.role === "super_admin")) {
      return { error: "Sin permisos" };
    }
  }

  const { error } = await admin
    .from("profiles")
    .update({ is_active: isActive })
    .eq("id", userId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/settings");
  revalidatePath("/settings/forwarders");
  revalidatePath("/settings/users");
  return null;
}

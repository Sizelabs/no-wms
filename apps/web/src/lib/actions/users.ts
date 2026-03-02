"use server";

import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

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
  revalidatePath("/companies");
  revalidatePath("/users");
}

export async function assignRole(formData: FormData): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from("user_roles").insert({
    user_id: formData.get("user_id") as string,
    organization_id: formData.get("organization_id") as string,
    role: formData.get("role") as string,
    warehouse_id: (formData.get("warehouse_id") as string) || null,
    destination_country_id:
      (formData.get("destination_country_id") as string) || null,
    agency_id: (formData.get("agency_id") as string) || null,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/settings");
  revalidatePath("/companies");
  revalidatePath("/users");
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
  revalidatePath("/companies");
  revalidatePath("/users");
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
  opts?: { warehouse_id?: string; agency_id?: string },
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
    agency_id: opts?.agency_id || null,
  });

  if (roleError) {
    await admin.auth.admin.deleteUser(userId);
    return { error: roleError.message };
  }

  revalidatePath("/settings");
  revalidatePath("/companies");
  revalidatePath("/users");
  return null;
}

/**
 * Resend the invite email to a user who hasn't set their password yet.
 */
export async function resendInvite(
  userId: string,
): Promise<{ error: string } | null> {
  const admin = createAdminClient();

  // Get the user's email from auth
  const { data: authUser, error: fetchError } =
    await admin.auth.admin.getUserById(userId);

  if (fetchError || !authUser.user?.email) {
    return { error: fetchError?.message ?? "Usuario no encontrado" };
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const { error } = await admin.auth.admin.inviteUserByEmail(
    authUser.user.email,
    { redirectTo: `${siteUrl}/auth/callback` },
  );

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/users");
  revalidatePath("/companies");
  return null;
}

/**
 * Send a password reset email to a user.
 */
export async function resetUserPassword(
  userId: string,
): Promise<{ error: string } | null> {
  const admin = createAdminClient();

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

  revalidatePath("/users");
  revalidatePath("/companies");
  return null;
}

/**
 * Toggle a user's is_active status.
 */
export async function toggleUserActive(
  userId: string,
  isActive: boolean,
): Promise<{ error: string } | null> {
  const admin = createAdminClient();

  const { error } = await admin
    .from("profiles")
    .update({ is_active: isActive })
    .eq("id", userId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/settings");
  revalidatePath("/companies");
  revalidatePath("/users");
  return null;
}

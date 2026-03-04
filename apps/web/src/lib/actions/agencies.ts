"use server";

import { revalidatePath } from "next/cache";

import { getUserAgencyScope, getUserCourrierScope } from "@/lib/auth/scope";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function getAgencies() {
  const supabase = await createClient();
  const [courrierIds, agencyIds] = await Promise.all([
    getUserCourrierScope(),
    getUserAgencyScope(),
  ]);

  let query = supabase
    .from("agencies")
    .select("*, destination_countries(name), courriers(name, code)")
    .order("name");

  // Destination roles only see agencies under their courrier(s)
  if (courrierIds !== null) {
    query = query.in("courrier_id", courrierIds.length > 0 ? courrierIds : ["00000000-0000-0000-0000-000000000000"]);
  }

  // Agency roles only see their own agency(ies)
  if (agencyIds !== null) {
    query = query.in("id", agencyIds.length > 0 ? agencyIds : ["00000000-0000-0000-0000-000000000000"]);
  }

  const { data, error } = await query;

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function getAgency(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("agencies")
    .select("*, destination_countries(name), courriers(name, code), agency_contacts(*)")
    .eq("id", id)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function createAgency(formData: FormData): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from("agencies").insert({
    organization_id: formData.get("organization_id") as string,
    destination_country_id: formData.get("destination_country_id") as string,
    courrier_id: (formData.get("courrier_id") as string) || null,
    name: formData.get("name") as string,
    code: formData.get("code") as string,
    type: formData.get("type") as string,
    ruc: (formData.get("ruc") as string) || null,
    address: (formData.get("address") as string) || null,
    phone: (formData.get("phone") as string) || null,
    email: (formData.get("email") as string) || null,
    allow_multi_package: formData.get("allow_multi_package") === "on",
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/agencies");
}

export async function deleteAgency(
  id: string,
): Promise<{ error: string } | null> {
  const supabase = await createClient();

  const { error } = await supabase.from("agencies").delete().eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/agencies");
  revalidatePath("/companies");
  return null;
}

export async function getAgencySettings(agencyIds: string[]) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("agencies")
    .select("id, name, code, allow_multi_package")
    .in("id", agencyIds)
    .order("name");

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function updateAgencySettings(
  id: string,
  settings: { allow_multi_package: boolean },
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("agencies")
    .update({ allow_multi_package: settings.allow_multi_package })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/settings");
}

export async function createAgencyWithAdmin(formData: FormData): Promise<void> {
  const admin = createAdminClient();

  const organizationId = formData.get("organization_id") as string;
  const adminName = formData.get("admin_name") as string;
  const adminEmail = formData.get("admin_email") as string;

  // 1. Invite auth user first (failure-prone external call — nothing to clean up if it fails)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { data: authData, error: authError } =
    await admin.auth.admin.inviteUserByEmail(adminEmail, {
      data: { full_name: adminName },
      redirectTo: `${siteUrl}/auth/callback`,
    });

  if (authError) {
    throw new Error(authError.message);
  }

  const userId = authData.user.id;

  // 2. Create agency
  const { data: agency, error: agencyError } = await admin
    .from("agencies")
    .insert({
      organization_id: organizationId,
      destination_country_id: formData.get("destination_country_id") as string,
      courrier_id: (formData.get("courrier_id") as string) || null,
      name: formData.get("name") as string,
      code: formData.get("code") as string,
      type: formData.get("type") as string,
      ruc: (formData.get("ruc") as string) || null,
      address: (formData.get("address") as string) || null,
      phone: (formData.get("phone") as string) || null,
      email: (formData.get("email") as string) || null,
      allow_multi_package: formData.get("allow_multi_package") === "on",
    })
    .select("id")
    .single();

  if (agencyError) {
    await admin.auth.admin.deleteUser(userId);
    throw new Error(agencyError.message);
  }

  // 3. Create profile
  const { error: profileError } = await admin.from("profiles").insert({
    id: userId,
    organization_id: organizationId,
    full_name: adminName,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(userId);
    await admin.from("agencies").delete().eq("id", agency.id);
    throw new Error(profileError.message);
  }

  // 4. Assign agency role
  const { error: roleError } = await admin.from("user_roles").insert({
    user_id: userId,
    organization_id: organizationId,
    role: "agency",
    agency_id: agency.id,
  });

  if (roleError) {
    await admin.auth.admin.deleteUser(userId);
    await admin.from("agencies").delete().eq("id", agency.id);
    throw new Error(roleError.message);
  }

  revalidatePath("/agencies");
  revalidatePath("/courriers");
  revalidatePath("/companies");
}

export async function updateAgency(id: string, formData: FormData): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("agencies")
    .update({
      name: formData.get("name") as string,
      code: formData.get("code") as string,
      type: formData.get("type") as string,
      ruc: (formData.get("ruc") as string) || null,
      address: (formData.get("address") as string) || null,
      phone: (formData.get("phone") as string) || null,
      email: (formData.get("email") as string) || null,
      allow_multi_package: formData.get("allow_multi_package") === "on",
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/agencies");
}

"use server";

import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function getOrganizations() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .order("name");

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function getOrganization(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function getOrganizationCounts(orgId: string) {
  const supabase = await createClient();

  const [warehouses, courriers, agencies, users] = await Promise.all([
    supabase
      .from("warehouses")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId),
    supabase
      .from("courriers")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId),
    supabase
      .from("agencies")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId),
  ]);

  return {
    warehouses: warehouses.count ?? 0,
    courriers: courriers.count ?? 0,
    agencies: agencies.count ?? 0,
    users: users.count ?? 0,
  };
}

export async function getOrganizationWarehouses(orgId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("warehouses")
    .select("*")
    .eq("organization_id", orgId)
    .order("name");

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function getOrganizationCourriers(orgId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("courriers")
    .select("*, courrier_coverage(id, destination_countries(name))")
    .eq("organization_id", orgId)
    .order("name");

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function getOrganizationAgencies(orgId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("agencies")
    .select("*, destination_countries(name)")
    .eq("organization_id", orgId)
    .order("name");

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function getOrganizationUsers(orgId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("*, user_roles(*)")
    .eq("organization_id", orgId)
    .order("full_name");

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function createOrganization(formData: FormData): Promise<void> {
  const admin = createAdminClient();
  const name = formData.get("name") as string;
  const adminName = formData.get("admin_name") as string;
  const adminEmail = formData.get("admin_email") as string;

  // 1. Invite auth user first (failure-prone external call — nothing to clean up if it fails)
  const siteUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
    : "http://localhost:3000";
  const { data: authData, error: authError } =
    await admin.auth.admin.inviteUserByEmail(adminEmail, {
      data: { full_name: adminName },
      redirectTo: `${siteUrl}/auth/callback`,
    });

  if (authError) {
    throw new Error(authError.message);
  }

  const userId = authData.user.id;

  // 2. Create the organization
  const { data: org, error: orgError } = await admin
    .from("organizations")
    .insert({
      name,
      slug: slugify(name),
      logo_url: (formData.get("logo_url") as string) || null,
    })
    .select("id")
    .single();

  if (orgError) {
    await admin.auth.admin.deleteUser(userId);
    throw new Error(orgError.message);
  }

  // 3. Create the profile
  const { error: profileError } = await admin.from("profiles").insert({
    id: userId,
    organization_id: org.id,
    full_name: adminName,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(userId);
    await admin.from("organizations").delete().eq("id", org.id);
    throw new Error(profileError.message);
  }

  // 4. Assign company_admin role
  const { error: roleError } = await admin.from("user_roles").insert({
    user_id: userId,
    organization_id: org.id,
    role: "company_admin",
  });

  if (roleError) {
    await admin.auth.admin.deleteUser(userId);
    await admin.from("organizations").delete().eq("id", org.id);
    throw new Error(roleError.message);
  }

  revalidatePath("/companies");
}

export async function updateOrganization(
  id: string,
  formData: FormData,
): Promise<void> {
  const supabase = await createClient();

  const name = formData.get("name") as string;

  const { error } = await supabase
    .from("organizations")
    .update({
      name,
      slug: slugify(name),
      logo_url: (formData.get("logo_url") as string) || null,
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/companies");
}

export async function deleteOrganization(
  id: string,
): Promise<{ error: string } | null> {
  const admin = createAdminClient();

  const { error } = await admin
    .from("organizations")
    .delete()
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/companies");
  return null;
}

"use server";

import { revalidatePath } from "next/cache";

import {
  DEFAULT_MODALITY_CODES,
  DEFAULT_MODALITY_LABELS,
} from "@no-wms/shared/constants/modalities";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const DEFAULT_HANDLING_COST_NAMES = [
  "Flete Aereo Minimo",
  "Flete Aereo x KG",
  "FSC x KG",
  "SCR x KG",
  "SED",
  "MAWB",
  "HAWB",
  "Delivery por KG",
  "DGR",
  "Ordenes de Trabajo",
  "Bodegaje",
  "Handling",
];

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

  const [warehouses, couriers, agencies, users] = await Promise.all([
    supabase
      .from("warehouses")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId),
    supabase
      .from("couriers")
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
    couriers: couriers.count ?? 0,
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

export async function getOrganizationCouriers(orgId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("couriers")
    .select("*, courier_warehouses(id, warehouses(name), courier_warehouse_destinations(id, destinations(city, country_code)))")
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
    .select("*, agency_destinations(destination_id, is_home, destinations(city, country_code))")
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

  // 4. Assign forwarder_admin role
  const { error: roleError } = await admin.from("user_roles").insert({
    user_id: userId,
    organization_id: org.id,
    role: "forwarder_admin",
  });

  if (roleError) {
    await admin.auth.admin.deleteUser(userId);
    await admin.from("organizations").delete().eq("id", org.id);
    throw new Error(roleError.message);
  }

  // 5. Seed default modalities
  await admin.from("modalities").insert(
    DEFAULT_MODALITY_CODES.map((code, i) => ({
      organization_id: org.id,
      name: DEFAULT_MODALITY_LABELS[code],
      code,
      display_order: i + 1,
    })),
  );

  // 6. Seed default handling costs
  await admin.from("handling_costs").insert(
    DEFAULT_HANDLING_COST_NAMES.map((name) => ({
      organization_id: org.id,
      name,
    })),
  );

  revalidatePath("/settings/forwarders");
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

  revalidatePath("/settings/forwarders");
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

  revalidatePath("/settings/forwarders");
  return null;
}

"use server";

import { revalidatePath } from "next/cache";

import { getUserCourrierScope } from "@/lib/auth/scope";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function getCourriers() {
  const supabase = await createClient();
  const courrierIds = await getUserCourrierScope();

  let query = supabase
    .from("courriers")
    .select("*, courrier_coverage(id, destination_country_id, city, is_active, destination_countries(name, code))")
    .order("name");

  if (courrierIds !== null) {
    query = query.in("id", courrierIds.length > 0 ? courrierIds : ["00000000-0000-0000-0000-000000000000"]);
  }

  const { data, error } = await query;

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function getCourrier(id: string) {
  const supabase = await createClient();
  const courrierIds = await getUserCourrierScope();

  // Destination roles can only access their own courrier(s)
  if (courrierIds !== null && !courrierIds.includes(id)) {
    return { data: null, error: "Forbidden" };
  }

  const { data, error } = await supabase
    .from("courriers")
    .select("*, courrier_coverage(id, destination_country_id, city, is_active, destination_countries(name, code)), agencies(id, name, code, type, is_active)")
    .eq("id", id)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function createCourrier(formData: FormData): Promise<void> {
  const admin = createAdminClient();

  const organizationId = formData.get("organization_id") as string;
  const adminName = formData.get("admin_name") as string;
  const adminEmail = formData.get("admin_email") as string;

  // 1. Create courrier
  const { data: courrier, error: courrierError } = await admin
    .from("courriers")
    .insert({
      organization_id: organizationId,
      name: formData.get("name") as string,
      code: formData.get("code") as string,
      type: formData.get("type") as string,
      ruc: (formData.get("ruc") as string) || null,
      address: (formData.get("address") as string) || null,
      city: (formData.get("city") as string) || null,
      country: (formData.get("country") as string) || null,
      phone: (formData.get("phone") as string) || null,
      email: (formData.get("email") as string) || null,
    })
    .select("id")
    .single();

  if (courrierError) {
    throw new Error(courrierError.message);
  }

  // 2. Invite admin user
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { data: authData, error: authError } =
    await admin.auth.admin.inviteUserByEmail(adminEmail, {
      data: { full_name: adminName },
      redirectTo: `${siteUrl}/auth/callback`,
    });

  if (authError) {
    await admin.from("courriers").delete().eq("id", courrier.id);
    throw new Error(authError.message);
  }

  const userId = authData.user.id;

  // 3. Create profile
  const { error: profileError } = await admin.from("profiles").insert({
    id: userId,
    organization_id: organizationId,
    full_name: adminName,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(userId);
    await admin.from("courriers").delete().eq("id", courrier.id);
    throw new Error(profileError.message);
  }

  // 4. Assign destination_admin role
  const { error: roleError } = await admin.from("user_roles").insert({
    user_id: userId,
    organization_id: organizationId,
    role: "destination_admin",
    courrier_id: courrier.id,
  });

  if (roleError) {
    await admin.auth.admin.deleteUser(userId);
    await admin.from("courriers").delete().eq("id", courrier.id);
    throw new Error(roleError.message);
  }

  revalidatePath("/courriers");
  revalidatePath("/companies");
}

export async function updateCourrier(id: string, formData: FormData): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("courriers")
    .update({
      name: formData.get("name") as string,
      code: formData.get("code") as string,
      type: formData.get("type") as string,
      ruc: (formData.get("ruc") as string) || null,
      address: (formData.get("address") as string) || null,
      city: (formData.get("city") as string) || null,
      country: (formData.get("country") as string) || null,
      phone: (formData.get("phone") as string) || null,
      email: (formData.get("email") as string) || null,
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/courriers");
  revalidatePath("/companies");
}

export async function deleteCourrier(id: string): Promise<{ error: string } | null> {
  const supabase = await createClient();

  const { error } = await supabase.from("courriers").delete().eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/courriers");
  revalidatePath("/companies");
  return null;
}

export async function addCourrierCoverage(
  courrierId: string,
  destinationCountryId: string,
  organizationId: string,
  city?: string,
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from("courrier_coverage").insert({
    organization_id: organizationId,
    courrier_id: courrierId,
    destination_country_id: destinationCountryId,
    city: city || null,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/courriers");
}

export async function removeCourrierCoverage(id: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from("courrier_coverage").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/courriers");
}

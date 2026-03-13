"use server";

import { revalidatePath } from "next/cache";

import { getUserCourierScope } from "@/lib/auth/scope";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function getCouriers() {
  const supabase = await createClient();
  const courierIds = await getUserCourierScope();

  let query = supabase
    .from("couriers")
    .select(`*, courier_destinations(
      id, destination_id, modality_id, is_active,
      destinations(city, state, country_code),
      modalities(id, name, code)
    )`)
    .order("name");

  if (courierIds !== null) {
    query = query.in("id", courierIds.length > 0 ? courierIds : ["00000000-0000-0000-0000-000000000000"]);
  }

  const { data, error } = await query;

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function getCourier(id: string) {
  const supabase = await createClient();
  const courierIds = await getUserCourierScope();

  // Destination roles can only access their own courier(s)
  if (courierIds !== null && !courierIds.includes(id)) {
    return { data: null, error: "Forbidden" };
  }

  const { data, error } = await supabase
    .from("couriers")
    .select(`*, courier_destinations(
      id, destination_id, modality_id, is_active,
      destinations(city, state, country_code),
      modalities(id, name, code)
    ), agencies(id, name, code, type, is_active)`)
    .eq("id", id)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function createCourier(formData: FormData): Promise<void> {
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

  // 2. Create courier
  const { data: courier, error: courierError } = await admin
    .from("couriers")
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

  if (courierError) {
    await admin.auth.admin.deleteUser(userId);
    throw new Error(courierError.message);
  }

  // 3. Create profile
  const { error: profileError } = await admin.from("profiles").insert({
    id: userId,
    organization_id: organizationId,
    full_name: adminName,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(userId);
    await admin.from("couriers").delete().eq("id", courier.id);
    throw new Error(profileError.message);
  }

  // 4. Assign destination_admin role
  const { error: roleError } = await admin.from("user_roles").insert({
    user_id: userId,
    organization_id: organizationId,
    role: "destination_admin",
    courier_id: courier.id,
  });

  if (roleError) {
    await admin.auth.admin.deleteUser(userId);
    await admin.from("couriers").delete().eq("id", courier.id);
    throw new Error(roleError.message);
  }

  revalidatePath("/settings/couriers");
  revalidatePath("/settings/forwarders");
}

export async function updateCourier(id: string, formData: FormData): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("couriers")
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

  revalidatePath("/settings/couriers");
  revalidatePath("/settings/forwarders");
}

export async function deleteCourier(id: string): Promise<{ error: string } | null> {
  const supabase = await createClient();

  const { error } = await supabase.from("couriers").delete().eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/settings/couriers");
  revalidatePath("/settings/forwarders");
  return null;
}

// ── Courier Destinations ──

export async function upsertCourierDestination(
  courierId: string,
  destinationId: string,
  modalityId: string,
  organizationId: string,
  isActive: boolean,
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("courier_destinations")
    .upsert(
      {
        organization_id: organizationId,
        courier_id: courierId,
        destination_id: destinationId,
        modality_id: modalityId,
        is_active: isActive,
      },
      { onConflict: "courier_id,destination_id,modality_id" },
    );

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/settings/couriers");
}

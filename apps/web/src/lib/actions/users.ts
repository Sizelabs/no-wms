"use server";

import { revalidatePath } from "next/cache";

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

export async function updateUserProfile(id: string, formData: FormData): Promise<void> {
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
}

export async function assignRole(formData: FormData): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from("user_roles").insert({
    profile_id: formData.get("profile_id") as string,
    organization_id: formData.get("organization_id") as string,
    role: formData.get("role") as string,
    warehouse_id: (formData.get("warehouse_id") as string) || null,
    destination_country_id: (formData.get("destination_country_id") as string) || null,
    agency_id: (formData.get("agency_id") as string) || null,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/settings");
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
}

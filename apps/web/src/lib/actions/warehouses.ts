"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export async function getWarehouses() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("warehouses")
    .select("*")
    .order("name");

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function getWarehouse(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("warehouses")
    .select("*, warehouse_zones(*, warehouse_locations(*))")
    .eq("id", id)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function createWarehouse(formData: FormData): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from("warehouses").insert({
    organization_id: formData.get("organization_id") as string,
    name: formData.get("name") as string,
    code: formData.get("code") as string,
    city: (formData.get("city") as string) || null,
    country: (formData.get("country") as string) || null,
    timezone: (formData.get("timezone") as string) || "America/New_York",
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/settings");
  revalidatePath("/warehouses");
  revalidatePath("/companies");
}

export async function deleteWarehouse(
  id: string,
): Promise<{ error: string } | null> {
  const supabase = await createClient();

  const { error } = await supabase.from("warehouses").delete().eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/warehouses");
  revalidatePath("/companies");
  return null;
}

export async function updateWarehouse(id: string, formData: FormData): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("warehouses")
    .update({
      name: formData.get("name") as string,
      code: formData.get("code") as string,
      city: (formData.get("city") as string) || null,
      country: (formData.get("country") as string) || null,
      timezone: (formData.get("timezone") as string) || "America/New_York",
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/settings");
  revalidatePath("/warehouses");
  revalidatePath("/companies");
}

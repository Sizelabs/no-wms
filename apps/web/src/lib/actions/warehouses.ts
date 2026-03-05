"use server";

import { revalidatePath } from "next/cache";

import { getUserWarehouseScope } from "@/lib/auth/scope";
import { createClient } from "@/lib/supabase/server";

export async function getWarehouses() {
  const supabase = await createClient();
  const warehouseScope = await getUserWarehouseScope();

  let query = supabase
    .from("warehouses")
    .select("*")
    .order("name");

  if (warehouseScope !== null && warehouseScope.length > 0) {
    query = query.in("id", warehouseScope);
  } else if (warehouseScope !== null && warehouseScope.length === 0) {
    return { data: [], error: null };
  }

  const { data, error } = await query;

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
  revalidatePath("/settings/warehouses");
  revalidatePath("/settings/forwarders");
}

export async function deleteWarehouse(
  id: string,
): Promise<{ error: string } | null> {
  const supabase = await createClient();

  const { error } = await supabase.from("warehouses").delete().eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/settings/warehouses");
  revalidatePath("/settings/forwarders");
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
  revalidatePath("/settings/warehouses");
  revalidatePath("/settings/forwarders");
}

"use server";

import { DEFAULT_WAREHOUSE_ZONES } from "@no-wms/shared/constants/locations";
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

  const code = ((formData.get("code") as string) || "").toUpperCase();
  if (!/^[A-Z]{2,5}$/.test(code)) {
    throw new Error("El código debe tener entre 2 y 5 letras (ej: MIA, LAX)");
  }

  // Check uniqueness within org (RLS scopes the query) for better error message
  const { count } = await supabase
    .from("warehouses")
    .select("id", { count: "exact", head: true })
    .eq("code", code);
  if ((count ?? 0) > 0) {
    throw new Error(`Ya existe una bodega con el código "${code}"`);
  }

  const orgId = formData.get("organization_id") as string;

  const { data: newWarehouse, error } = await supabase
    .from("warehouses")
    .insert({
      organization_id: orgId,
      name: formData.get("name") as string,
      code,
      city: (formData.get("city") as string) || null,
      country: (formData.get("country") as string) || null,
      timezone: (formData.get("timezone") as string) || "America/New_York",
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  // Create default zones for the new warehouse
  if (newWarehouse) {
    const zones = DEFAULT_WAREHOUSE_ZONES.map((z) => ({
      organization_id: orgId,
      warehouse_id: newWarehouse.id,
      name: z.name,
      code: z.code,
      zone_type: z.zone_type,
      sort_order: z.sort_order,
    }));
    await supabase.from("warehouse_zones").insert(zones);

    // Create virtual DISPATCH location in the staging zone
    const { data: stagingZone } = await supabase
      .from("warehouse_zones")
      .select("id")
      .eq("warehouse_id", newWarehouse.id)
      .eq("zone_type", "staging")
      .single();

    if (stagingZone) {
      await supabase.from("warehouse_locations").insert({
        organization_id: orgId,
        zone_id: stagingZone.id,
        warehouse_id: newWarehouse.id,
        name: "Despacho Virtual",
        code: "DISPATCH",
        barcode: `${code}-DES-DISPATCH`,
        sort_order: 9999,
      });
    }
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

  const code = ((formData.get("code") as string) || "").toUpperCase();
  if (!/^[A-Z]{2,5}$/.test(code)) {
    throw new Error("El código debe tener entre 2 y 5 letras (ej: MIA, LAX)");
  }

  // Check uniqueness within org (RLS scopes the query), excluding self
  const { count } = await supabase
    .from("warehouses")
    .select("id", { count: "exact", head: true })
    .eq("code", code)
    .neq("id", id);
  if ((count ?? 0) > 0) {
    throw new Error(`Ya existe una bodega con el código "${code}"`);
  }

  const { error } = await supabase
    .from("warehouses")
    .update({
      name: formData.get("name") as string,
      code,
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

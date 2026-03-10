"use server";

import { buildBarcode, buildStorageCode } from "@no-wms/shared/utils/location-barcode";
import type { CreateZoneInput, UpdateZoneInput, CreateLocationInput, UpdateLocationInput, BulkCreateStorageLocationsInput, RecordMovementInput, ToggleBlockedInput } from "@no-wms/shared/validators/location";
import { createZoneSchema, updateZoneSchema, createLocationSchema, updateLocationSchema, bulkCreateStorageLocationsSchema, recordMovementSchema, toggleBlockedSchema } from "@no-wms/shared/validators/location";
import { revalidatePath } from "next/cache";

import { getUserWarehouseScope } from "@/lib/auth/scope";
import { createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Zones
// ---------------------------------------------------------------------------

export async function getZonesForWarehouse(warehouseId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("warehouse_zones")
    .select("id, name, code, zone_type, is_active, sort_order, warehouse_id, updated_at")
    .eq("warehouse_id", warehouseId)
    .order("sort_order");

  if (error) return [];

  // Get location counts per zone
  const zoneIds = (data ?? []).map((z) => z.id);
  const { data: locationCounts } = await supabase
    .from("warehouse_locations")
    .select("zone_id")
    .in("zone_id", zoneIds);

  const countMap = new Map<string, number>();
  for (const loc of locationCounts ?? []) {
    countMap.set(loc.zone_id, (countMap.get(loc.zone_id) ?? 0) + 1);
  }

  return (data ?? []).map((z) => ({
    ...z,
    location_count: countMap.get(z.id) ?? 0,
  }));
}

export async function createZone(raw: CreateZoneInput) {
  const parsed = createZoneSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("organization_id").limit(1).single();
  if (!profile?.organization_id) return { error: "Sin organización" };

  // Auto-assign sort_order as max + 1
  const { data: maxZone } = await supabase
    .from("warehouse_zones")
    .select("sort_order")
    .eq("warehouse_id", parsed.data.warehouse_id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = (maxZone?.sort_order ?? 0) + 1;

  const { data, error } = await supabase
    .from("warehouse_zones")
    .insert({
      organization_id: profile.organization_id,
      warehouse_id: parsed.data.warehouse_id,
      name: parsed.data.name,
      code: parsed.data.code,
      zone_type: parsed.data.zone_type,
      sort_order: parsed.data.sort_order ?? nextOrder,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/settings/locations");
  return { data };
}

export async function updateZone(id: string, raw: UpdateZoneInput) {
  const parsed = updateZoneSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("warehouse_zones")
    .update(parsed.data)
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/settings/locations");
  return { data: { id } };
}

export async function deleteZone(id: string) {
  const supabase = await createClient();

  // Check if any locations in this zone have packages
  const { data: locations } = await supabase
    .from("warehouse_locations")
    .select("id, current_count")
    .eq("zone_id", id);

  const hasPackages = (locations ?? []).some((l) => (l.current_count ?? 0) > 0);
  if (hasPackages) return { error: "No se puede eliminar: hay paquetes en ubicaciones de esta zona" };

  const { error } = await supabase.from("warehouse_zones").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/settings/locations");
  return { data: { id } };
}

// ---------------------------------------------------------------------------
// Locations
// ---------------------------------------------------------------------------

export async function getLocationsForZone(zoneId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("warehouse_locations")
    .select("id, name, code, barcode, is_active, is_blocked, blocked_reason, blocked_at, max_packages, current_count, max_weight_lb, max_length_in, max_width_in, max_height_in, preferred_agency_id, sort_order, warehouse_id, zone_id, updated_at")
    .eq("zone_id", zoneId)
    .order("code");

  if (error) return [];
  return data ?? [];
}

export async function getLocationsForWarehouse(warehouseId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("warehouse_locations")
    .select("id, name, code, barcode, is_active, is_blocked, current_count, max_packages, zone_id, warehouse_zones:zone_id(name, code, zone_type)")
    .eq("warehouse_id", warehouseId)
    .order("code");

  if (error) return [];
  return data ?? [];
}

export async function createLocation(raw: CreateLocationInput) {
  const parsed = createLocationSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const supabase = await createClient();

  // Get zone → warehouse → warehouse code for barcode
  const { data: zone } = await supabase
    .from("warehouse_zones")
    .select("id, code, warehouse_id, organization_id, warehouses:warehouse_id(code)")
    .eq("id", parsed.data.zone_id)
    .single();

  if (!zone) return { error: "Zona no encontrada" };

  const wh = zone.warehouses as { code: string } | { code: string }[] | null;
  const warehouseCode = wh ? (Array.isArray(wh) ? wh[0]?.code : wh.code) : null;
  if (!warehouseCode) return { error: "Bodega no encontrada" };

  const barcode = buildBarcode(warehouseCode, zone.code, parsed.data.code);

  const { data, error } = await supabase
    .from("warehouse_locations")
    .insert({
      organization_id: zone.organization_id,
      zone_id: parsed.data.zone_id,
      warehouse_id: zone.warehouse_id,
      name: parsed.data.name,
      code: parsed.data.code,
      barcode,
      max_packages: parsed.data.max_packages ?? null,
      max_weight_lb: parsed.data.max_weight_lb ?? null,
      max_length_in: parsed.data.max_length_in ?? null,
      max_width_in: parsed.data.max_width_in ?? null,
      max_height_in: parsed.data.max_height_in ?? null,
      preferred_agency_id: parsed.data.preferred_agency_id ?? null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/settings/locations");
  return { data };
}

export async function updateLocation(id: string, raw: UpdateLocationInput) {
  const parsed = updateLocationSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const updateData: Record<string, unknown> = { ...parsed.data };

  // If updating code, rebuild barcode
  if (parsed.data.code) {
    const supabase = await createClient();
    const { data: loc } = await supabase
      .from("warehouse_locations")
      .select("zone_id, warehouse_zones:zone_id(code, warehouses:warehouse_id(code))")
      .eq("id", id)
      .single();

    if (loc) {
      type ZoneRel = { code: string; warehouses: { code: string }[] | { code: string } | null };
      const zoneRaw = loc.warehouse_zones as ZoneRel | ZoneRel[] | null;
      const zone = zoneRaw ? (Array.isArray(zoneRaw) ? zoneRaw[0] : zoneRaw) : null;
      const wh = zone?.warehouses;
      const whCode = wh ? (Array.isArray(wh) ? wh[0]?.code : wh.code) : null;
      if (whCode && zone) {
        updateData.barcode = buildBarcode(whCode, zone.code, parsed.data.code);
      }
    }
  }

  // Handle blocked_at timestamp
  if (parsed.data.is_blocked === true) {
    updateData.blocked_at = new Date().toISOString();
  } else if (parsed.data.is_blocked === false) {
    updateData.blocked_at = null;
    updateData.blocked_reason = null;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("warehouse_locations")
    .update(updateData)
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/settings/locations");
  return { data: { id } };
}

export async function deleteLocation(id: string) {
  const supabase = await createClient();

  // Check if location has packages
  const { data: loc } = await supabase
    .from("warehouse_locations")
    .select("current_count")
    .eq("id", id)
    .single();

  if (loc && (loc.current_count ?? 0) > 0) {
    return { error: "No se puede eliminar: hay paquetes en esta ubicación" };
  }

  const { error } = await supabase.from("warehouse_locations").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/settings/locations");
  return { data: { id } };
}

// ---------------------------------------------------------------------------
// Bulk generation (storage zones)
// ---------------------------------------------------------------------------

export async function bulkCreateStorageLocations(raw: BulkCreateStorageLocationsInput) {
  const parsed = bulkCreateStorageLocationsSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const { zone_id, aisles, racks_per_aisle, shelves_per_rack, positions_per_shelf } = parsed.data;

  const supabase = await createClient();

  // Get zone info for barcode generation
  const { data: zone } = await supabase
    .from("warehouse_zones")
    .select("id, code, warehouse_id, organization_id, warehouses:warehouse_id(code)")
    .eq("id", zone_id)
    .single();

  if (!zone) return { error: "Zona no encontrada" };

  const wh = zone.warehouses as { code: string } | { code: string }[] | null;
  const warehouseCode = wh ? (Array.isArray(wh) ? wh[0]?.code : wh.code) : null;
  if (!warehouseCode) return { error: "Bodega no encontrada" };

  const aisleList = aisles.split(",");
  const locations: Array<{
    organization_id: string;
    zone_id: string;
    warehouse_id: string;
    name: string;
    code: string;
    barcode: string;
    sort_order: number;
  }> = [];

  let sortOrder = 1;
  for (const aisle of aisleList) {
    for (let rack = 1; rack <= racks_per_aisle; rack++) {
      for (let shelf = 1; shelf <= shelves_per_rack; shelf++) {
        for (let position = 1; position <= positions_per_shelf; position++) {
          const code = buildStorageCode(aisle, rack, shelf, position);
          const barcode = buildBarcode(warehouseCode, zone.code, code);
          locations.push({
            organization_id: zone.organization_id,
            zone_id,
            warehouse_id: zone.warehouse_id,
            name: code,
            code,
            barcode,
            sort_order: sortOrder++,
          });
        }
      }
    }
  }

  if (locations.length === 0) return { error: "No se generaron ubicaciones" };
  if (locations.length > 5000) return { error: "Demasiadas ubicaciones (máximo 5000)" };

  // Insert in batches of 500
  const batchSize = 500;
  let insertedCount = 0;
  for (let i = 0; i < locations.length; i += batchSize) {
    const batch = locations.slice(i, i + batchSize);
    const { error } = await supabase.from("warehouse_locations").insert(batch);
    if (error) return { error: error.message };
    insertedCount += batch.length;
  }

  revalidatePath("/settings/locations");
  return { data: { count: insertedCount } };
}

// ---------------------------------------------------------------------------
// Block/unblock
// ---------------------------------------------------------------------------

export async function toggleLocationBlocked(id: string, raw: ToggleBlockedInput) {
  const parsed = toggleBlockedSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const supabase = await createClient();
  const updateData: Record<string, unknown> = {
    is_blocked: parsed.data.is_blocked,
    blocked_reason: parsed.data.is_blocked ? (parsed.data.blocked_reason ?? null) : null,
    blocked_at: parsed.data.is_blocked ? new Date().toISOString() : null,
  };

  const { error } = await supabase
    .from("warehouse_locations")
    .update(updateData)
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/settings/locations");
  return { data: { id } };
}

// ---------------------------------------------------------------------------
// Movements
// ---------------------------------------------------------------------------

export async function recordMovement(raw: RecordMovementInput) {
  const parsed = recordMovementSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single();
  if (!profile?.organization_id) return { error: "Sin organización" };

  // Insert movement record
  const { data: movement, error: moveError } = await supabase
    .from("package_movements")
    .insert({
      organization_id: profile.organization_id,
      package_id: parsed.data.package_id,
      warehouse_id: parsed.data.warehouse_id,
      from_location_id: parsed.data.from_location_id ?? null,
      to_location_id: parsed.data.to_location_id,
      movement_type: parsed.data.movement_type,
      moved_by: user.id,
      suggested_location_id: parsed.data.suggested_location_id ?? null,
      notes: parsed.data.notes ?? null,
    })
    .select("id")
    .single();

  if (moveError) return { error: moveError.message };

  // Update package location (trigger handles current_count)
  const { error: pkgError } = await supabase
    .from("packages")
    .update({ warehouse_location_id: parsed.data.to_location_id })
    .eq("id", parsed.data.package_id);

  if (pkgError) return { error: pkgError.message };

  revalidatePath("/inventory");
  revalidatePath("/warehouse-receipts");
  return { data: movement };
}

export async function getMovementsForPackage(packageId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("package_movements")
    .select(`
      id, movement_type, notes, created_at,
      from_location:from_location_id(id, code, barcode),
      to_location:to_location_id(id, code, barcode),
      moved_by_profile:moved_by(full_name)
    `)
    .eq("package_id", packageId)
    .order("created_at", { ascending: false });

  if (error) return [];
  return data ?? [];
}

// ---------------------------------------------------------------------------
// Warehouse list for selectors
// ---------------------------------------------------------------------------

export async function getWarehousesForLocationManagement() {
  const supabase = await createClient();
  const scope = await getUserWarehouseScope();

  let query = supabase
    .from("warehouses")
    .select("id, name, code")
    .eq("is_active", true)
    .order("name");

  if (scope) {
    query = query.in("id", scope);
  }

  const { data, error } = await query;
  if (error) return [];
  return data ?? [];
}

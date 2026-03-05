"use server";

import { revalidatePath } from "next/cache";

import { getUserCourierScope } from "@/lib/auth/scope";
import { createClient } from "@/lib/supabase/server";

// ── Helpers ──

async function getAuthProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  return { supabase, profile };
}

// ── Charge Types ──

export async function getChargeTypes() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("charge_types")
    .select("*")
    .order("display_order")
    .order("name");

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function getChargeType(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("charge_types")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function createChargeType(formData: FormData): Promise<{ id: string } | { error: string }> {
  const { supabase, profile } = await getAuthProfile();
  if (!profile) return { error: "No autenticado" };

  const { data, error } = await supabase
    .from("charge_types")
    .insert({
      organization_id: profile.organization_id,
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || null,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") return { error: "Ya existe un tipo de cargo con ese nombre" };
    return { error: error.message };
  }
  revalidatePath("/settings/charge-types");
  return { id: data.id };
}

export async function updateChargeType(id: string, formData: FormData): Promise<{ error?: string }> {
  const { supabase, profile } = await getAuthProfile();
  if (!profile) return { error: "No autenticado" };

  const updates: Record<string, unknown> = {};
  for (const field of ["name", "description"]) {
    const val = formData.get(field) as string | null;
    if (val !== null) updates[field] = val || null;
  }
  const isActive = formData.get("is_active");
  if (isActive !== null) updates.is_active = isActive === "true";

  const { error } = await supabase
    .from("charge_types")
    .update(updates)
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/settings/charge-types");
  return {};
}

export async function deleteChargeType(id: string): Promise<{ error?: string }> {
  const { supabase, profile } = await getAuthProfile();
  if (!profile) return { error: "No autenticado" };

  const { error } = await supabase
    .from("charge_types")
    .update({ is_active: false })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/settings/charge-types");
  return {};
}

export async function reorderChargeTypes(ids: string[]): Promise<{ error?: string }> {
  const { supabase, profile } = await getAuthProfile();
  if (!profile) return { error: "No autenticado" };

  for (let i = 0; i < ids.length; i++) {
    const { error } = await supabase
      .from("charge_types")
      .update({ display_order: i + 1 })
      .eq("id", ids[i]);
    if (error) return { error: error.message };
  }

  revalidatePath("/settings/charge-types");
  return {};
}

// ── Modalities ──

export async function getModalities() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("modalities")
    .select("*")
    .order("display_order")
    .order("name");

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function getModality(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("modalities")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function createModality(formData: FormData): Promise<{ id: string } | { error: string }> {
  const { supabase, profile } = await getAuthProfile();
  if (!profile) return { error: "No autenticado" };

  const { data, error } = await supabase
    .from("modalities")
    .insert({
      organization_id: profile.organization_id,
      name: formData.get("name") as string,
      code: formData.get("code") as string,
      description: (formData.get("description") as string) || null,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") return { error: "Ya existe una modalidad con ese código" };
    return { error: error.message };
  }
  revalidatePath("/settings/modalities");
  return { id: data.id };
}

export async function updateModality(id: string, formData: FormData): Promise<{ error?: string }> {
  const { supabase, profile } = await getAuthProfile();
  if (!profile) return { error: "No autenticado" };

  const updates: Record<string, unknown> = {};
  for (const field of ["name", "code", "description"]) {
    const val = formData.get(field) as string | null;
    if (val !== null) updates[field] = val || null;
  }
  const isActive = formData.get("is_active");
  if (isActive !== null) updates.is_active = isActive === "true";

  const { error } = await supabase
    .from("modalities")
    .update(updates)
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/settings/modalities");
  return {};
}

export async function deleteModality(id: string): Promise<{ error?: string }> {
  const { supabase, profile } = await getAuthProfile();
  if (!profile) return { error: "No autenticado" };

  const { error } = await supabase
    .from("modalities")
    .update({ is_active: false })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/settings/modalities");
  return {};
}

// ── Warehouse Destination Modalities ──

export async function getWarehouseDestinationModalities(warehouseDestinationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("warehouse_destination_modalities")
    .select("*, modalities:modality_id(id, name, code)")
    .eq("warehouse_destination_id", warehouseDestinationId);

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function toggleWarehouseDestinationModality(
  warehouseDestinationId: string,
  modalityId: string,
  isActive: boolean,
): Promise<{ error?: string }> {
  const { supabase, profile } = await getAuthProfile();
  if (!profile) return { error: "No autenticado" };

  const { error } = await supabase
    .from("warehouse_destination_modalities")
    .upsert(
      {
        organization_id: profile.organization_id,
        warehouse_destination_id: warehouseDestinationId,
        modality_id: modalityId,
        is_active: isActive,
      },
      { onConflict: "warehouse_destination_id,modality_id" },
    );

  if (error) return { error: error.message };
  return {};
}

// ── Tariff Schedules ──

export async function getTariffSchedules(filters?: {
  warehouse_id?: string;
  charge_type_id?: string;
  destination_id?: string;
  agency_id?: string;
  courier_id?: string;
  is_active?: boolean;
}) {
  const supabase = await createClient();
  const courierScope = await getUserCourierScope();

  let query = supabase
    .from("tariff_schedules")
    .select(`
      *,
      warehouses:warehouse_id(id, name),
      charge_types:charge_type_id(id, name),
      destinations:destination_id(id, city, country_code),
      agencies:agency_id(id, name, code),
      couriers:courier_id(id, name, code)
    `)
    .order("created_at", { ascending: false });

  // Scope filtering for destination roles
  if (courierScope !== null && courierScope.length > 0) {
    query = query.or(`courier_id.in.(${courierScope.join(",")}),courier_id.is.null`);
  } else if (courierScope !== null && courierScope.length === 0) {
    return { data: [], error: null };
  }

  if (filters?.warehouse_id) query = query.eq("warehouse_id", filters.warehouse_id);
  if (filters?.charge_type_id) query = query.eq("charge_type_id", filters.charge_type_id);
  if (filters?.destination_id) query = query.eq("destination_id", filters.destination_id);
  if (filters?.agency_id) query = query.eq("agency_id", filters.agency_id);
  if (filters?.courier_id) query = query.eq("courier_id", filters.courier_id);
  if (filters?.is_active !== undefined) query = query.eq("is_active", filters.is_active);

  const { data, error } = await query;

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function getTariffSchedule(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tariff_schedules")
    .select(`
      *,
      warehouses:warehouse_id(id, name),
      charge_types:charge_type_id(id, name),
      destinations:destination_id(id, city, country_code),
      agencies:agency_id(id, name, code),
      couriers:courier_id(id, name, code)
    `)
    .eq("id", id)
    .single();

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function createTariffSchedule(formData: FormData): Promise<{ id: string } | { error: string }> {
  const { supabase, profile } = await getAuthProfile();
  if (!profile) return { error: "No autenticado" };

  const { data, error } = await supabase
    .from("tariff_schedules")
    .insert({
      organization_id: profile.organization_id,
      warehouse_id: formData.get("warehouse_id") as string,
      charge_type_id: formData.get("charge_type_id") as string,
      destination_id: (formData.get("destination_id") as string) || null,
      agency_id: (formData.get("agency_id") as string) || null,
      courier_id: (formData.get("courier_id") as string) || null,
      rate: parseFloat(formData.get("rate") as string) || 0,
      rate_unit: formData.get("rate_unit") as string,
      minimum_charge: (formData.get("minimum_charge") as string)
        ? parseFloat(formData.get("minimum_charge") as string)
        : null,
      currency: (formData.get("currency") as string) || "USD",
      effective_from: formData.get("effective_from") as string,
      effective_to: (formData.get("effective_to") as string) || null,
      notes: (formData.get("notes") as string) || null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/tariffs");
  return { id: data.id };
}

export async function updateTariffSchedule(id: string, formData: FormData): Promise<{ error?: string }> {
  const { supabase, profile } = await getAuthProfile();
  if (!profile) return { error: "No autenticado" };

  const updates: Record<string, unknown> = {};

  const stringFields = [
    "warehouse_id", "charge_type_id", "destination_id",
    "agency_id", "courier_id", "rate_unit", "currency",
    "effective_from", "effective_to", "notes",
  ];

  for (const field of stringFields) {
    const val = formData.get(field) as string | null;
    if (val !== null) updates[field] = val || null;
  }

  const numericFields = ["rate", "minimum_charge"];
  for (const field of numericFields) {
    const val = formData.get(field) as string | null;
    if (val !== null && val !== "") updates[field] = parseFloat(val);
  }

  const isActive = formData.get("is_active");
  if (isActive !== null) updates.is_active = isActive === "true";

  const { error } = await supabase
    .from("tariff_schedules")
    .update(updates)
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/tariffs");
  return {};
}

export async function deleteTariffSchedule(id: string): Promise<{ error?: string }> {
  const { supabase, profile } = await getAuthProfile();
  if (!profile) return { error: "No autenticado" };

  const { error } = await supabase
    .from("tariff_schedules")
    .update({ is_active: false })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/tariffs");
  return {};
}

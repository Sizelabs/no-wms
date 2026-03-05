"use server";

import { revalidatePath } from "next/cache";

import { getUserAgencyScope } from "@/lib/auth/scope";
import { createClient } from "@/lib/supabase/server";

export async function getTariffSchedules(filters?: {
  agency_id?: string;
  destination_id?: string;
  is_active?: boolean;
  rate_type?: string;
}) {
  const supabase = await createClient();
  const agencyScope = await getUserAgencyScope();

  if (agencyScope !== null && agencyScope.length === 0) {
    return { data: [], error: null };
  }

  let query = supabase
    .from("tariff_schedules")
    .select("*, agencies(name, code), destinations:destination_id(city, country_code), courier_warehouse_destinations(id, destinations(city, country_code))")
    .order("created_at", { ascending: false });

  if (agencyScope !== null) {
    query = query.in("agency_id", agencyScope);
  }

  if (filters?.agency_id) query = query.eq("agency_id", filters.agency_id);
  if (filters?.destination_id) query = query.eq("destination_id", filters.destination_id);
  if (filters?.is_active !== undefined) query = query.eq("is_active", filters.is_active);
  if (filters?.rate_type) query = query.eq("rate_type", filters.rate_type);

  const { data, error } = await query;

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function getTariffSchedule(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tariff_schedules")
    .select("*, agencies(name, code), destinations:destination_id(city, country_code), courier_warehouse_destinations(id, destinations(city, country_code))")
    .eq("id", id)
    .single();

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function createTariffSchedule(formData: FormData): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autenticado" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile) return { error: "Perfil no encontrado" };

  const rateType = (formData.get("rate_type") as string) || "agency_rate";
  const agencyId = rateType === "agency_rate" ? (formData.get("agency_id") as string) : null;

  const { data, error } = await supabase
    .from("tariff_schedules")
    .insert({
      organization_id: profile.organization_id,
      agency_id: agencyId,
      destination_id: formData.get("destination_id") as string,
      courier_warehouse_destination_id: (formData.get("courier_warehouse_destination_id") as string) || null,
      modality: formData.get("modality") as string,
      courier_category: (formData.get("courier_category") as string) || null,
      rate_type: rateType,
      effective_from: formData.get("effective_from") as string,
      effective_to: (formData.get("effective_to") as string) || null,
      min_weight_kg: parseFloat(formData.get("min_weight_kg") as string),
      max_weight_kg: parseFloat(formData.get("max_weight_kg") as string),
      rate_per_kg: parseFloat(formData.get("rate_per_kg") as string),
      minimum_charge: parseFloat(formData.get("minimum_charge") as string) || 0,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/tariffs");
  return { id: data.id };
}

export async function updateTariffSchedule(id: string, formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autenticado" };

  const updates: Record<string, unknown> = {};
  const stringFields = ["agency_id", "destination_id", "courier_warehouse_destination_id", "modality", "courier_category", "rate_type", "effective_from", "effective_to"];

  for (const field of stringFields) {
    const val = formData.get(field) as string | null;
    if (val !== null) {
      updates[field] = val || null;
    }
  }

  const numericFields = ["min_weight_kg", "max_weight_kg", "rate_per_kg", "minimum_charge"];
  for (const field of numericFields) {
    const val = formData.get(field) as string | null;
    if (val !== null) {
      updates[field] = parseFloat(val);
    }
  }

  const isActive = formData.get("is_active");
  if (isActive !== null) {
    updates.is_active = isActive === "true";
  }

  const { error } = await supabase
    .from("tariff_schedules")
    .update(updates)
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/tariffs");
  return {};
}

export async function deleteTariffSchedule(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autenticado" };

  // Soft deactivate
  const { error } = await supabase
    .from("tariff_schedules")
    .update({ is_active: false })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/tariffs");
  return {};
}

/**
 * Find the applicable tariff rate for a given set of parameters.
 * Weight brackets are now inline in tariff_schedules (no tariff_rates table).
 */
export async function getApplicableTariffRate(
  orgId: string,
  agencyId: string,
  destinationId: string,
  modality: string,
  category: string | null,
  weightKg: number,
): Promise<{ rate_per_kg: number; minimum_charge: number } | null> {
  const supabase = await createClient();

  // Find active schedule matching criteria with weight bracket
  let query = supabase
    .from("tariff_schedules")
    .select("rate_per_kg, minimum_charge")
    .eq("organization_id", orgId)
    .eq("agency_id", agencyId)
    .eq("destination_id", destinationId)
    .eq("modality", modality)
    .eq("rate_type", "agency_rate")
    .eq("is_active", true)
    .lte("effective_from", new Date().toISOString().split("T")[0]!)
    .lte("min_weight_kg", weightKg)
    .gte("max_weight_kg", weightKg)
    .order("effective_from", { ascending: false })
    .limit(1);

  if (category) {
    query = query.eq("courier_category", category);
  }

  const { data } = await query;

  if (!data?.length) return null;

  return {
    rate_per_kg: data[0]!.rate_per_kg,
    minimum_charge: data[0]!.minimum_charge,
  };
}

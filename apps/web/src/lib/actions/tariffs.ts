"use server";

import { revalidatePath } from "next/cache";

import { getUserAgencyScope } from "@/lib/auth/scope";
import { createClient } from "@/lib/supabase/server";

export async function getTariffSchedules(filters?: {
  agency_id?: string;
  destination_country_id?: string;
  is_active?: boolean;
}) {
  const supabase = await createClient();
  const agencyScope = await getUserAgencyScope();

  if (agencyScope !== null && agencyScope.length === 0) {
    return { data: [], error: null };
  }

  let query = supabase
    .from("tariff_schedules")
    .select("*, agencies(name, code), destination_countries(name, code)")
    .order("created_at", { ascending: false });

  if (agencyScope !== null) {
    query = query.in("agency_id", agencyScope);
  }

  if (filters?.agency_id) query = query.eq("agency_id", filters.agency_id);
  if (filters?.destination_country_id) query = query.eq("destination_country_id", filters.destination_country_id);
  if (filters?.is_active !== undefined) query = query.eq("is_active", filters.is_active);

  const { data, error } = await query;

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function getTariffSchedule(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tariff_schedules")
    .select("*, agencies(name, code), destination_countries(name, code), tariff_rates(*)")
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

  const { data, error } = await supabase
    .from("tariff_schedules")
    .insert({
      organization_id: profile.organization_id,
      agency_id: formData.get("agency_id") as string,
      destination_country_id: formData.get("destination_country_id") as string,
      modality: formData.get("modality") as string,
      courier_category: (formData.get("courier_category") as string) || null,
      effective_from: formData.get("effective_from") as string,
      effective_to: (formData.get("effective_to") as string) || null,
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
  const fields = ["agency_id", "destination_country_id", "modality", "courier_category", "effective_from", "effective_to"];

  for (const field of fields) {
    const val = formData.get(field) as string | null;
    if (val !== null) {
      updates[field] = val || null;
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

export async function createTariffRate(formData: FormData): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autenticado" };

  const { data, error } = await supabase
    .from("tariff_rates")
    .insert({
      schedule_id: formData.get("schedule_id") as string,
      min_weight_lb: parseFloat(formData.get("min_weight_lb") as string),
      max_weight_lb: parseFloat(formData.get("max_weight_lb") as string),
      rate_per_lb: parseFloat(formData.get("rate_per_lb") as string),
      minimum_charge: parseFloat(formData.get("minimum_charge") as string) || 0,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/tariffs");
  return { id: data.id };
}

export async function updateTariffRate(id: string, formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autenticado" };

  const { error } = await supabase
    .from("tariff_rates")
    .update({
      min_weight_lb: parseFloat(formData.get("min_weight_lb") as string),
      max_weight_lb: parseFloat(formData.get("max_weight_lb") as string),
      rate_per_lb: parseFloat(formData.get("rate_per_lb") as string),
      minimum_charge: parseFloat(formData.get("minimum_charge") as string) || 0,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/tariffs");
  return {};
}

export async function deleteTariffRate(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autenticado" };

  const { error } = await supabase
    .from("tariff_rates")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/tariffs");
  return {};
}

export async function importTariffRates(
  scheduleId: string,
  csvData: string,
): Promise<{ count: number } | { error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autenticado" };

  const lines = csvData.trim().split("\n");
  // Skip header row if present
  const startIdx = lines[0]?.toLowerCase().includes("min") ? 1 : 0;

  const rows: Array<{
    schedule_id: string;
    min_weight_lb: number;
    max_weight_lb: number;
    rate_per_lb: number;
    minimum_charge: number;
  }> = [];

  for (let i = startIdx; i < lines.length; i++) {
    const cols = lines[i]!.split(",").map((c) => c.trim());
    if (cols.length < 3) continue;

    const minWeight = parseFloat(cols[0]!);
    const maxWeight = parseFloat(cols[1]!);
    const ratePerLb = parseFloat(cols[2]!);
    const minimumCharge = cols[3] ? parseFloat(cols[3]) : 0;

    if (isNaN(minWeight) || isNaN(maxWeight) || isNaN(ratePerLb)) {
      return { error: `Fila ${i + 1}: valores numéricos inválidos` };
    }

    rows.push({
      schedule_id: scheduleId,
      min_weight_lb: minWeight,
      max_weight_lb: maxWeight,
      rate_per_lb: ratePerLb,
      minimum_charge: minimumCharge,
    });
  }

  if (!rows.length) return { error: "No se encontraron filas válidas en el CSV" };

  const { error } = await supabase.from("tariff_rates").insert(rows);

  if (error) return { error: error.message };

  revalidatePath("/tariffs");
  return { count: rows.length };
}

/**
 * Find the applicable tariff rate for a given set of parameters.
 * Pure lookup: find active schedule → find rate band for weight → return rate.
 */
export async function getApplicableTariffRate(
  orgId: string,
  agencyId: string,
  destCountryId: string,
  modality: string,
  category: string | null,
  weightLb: number,
): Promise<{ rate_per_lb: number; minimum_charge: number } | null> {
  const supabase = await createClient();

  // Find active schedule matching criteria
  let scheduleQuery = supabase
    .from("tariff_schedules")
    .select("id")
    .eq("organization_id", orgId)
    .eq("agency_id", agencyId)
    .eq("destination_country_id", destCountryId)
    .eq("modality", modality)
    .eq("is_active", true)
    .lte("effective_from", new Date().toISOString().split("T")[0]!)
    .order("effective_from", { ascending: false })
    .limit(1);

  if (category) {
    scheduleQuery = scheduleQuery.eq("courier_category", category);
  }

  const { data: schedules } = await scheduleQuery;

  if (!schedules?.length) return null;

  // Find rate band for weight
  const { data: rates } = await supabase
    .from("tariff_rates")
    .select("rate_per_lb, minimum_charge")
    .eq("schedule_id", schedules[0]!.id)
    .lte("min_weight_lb", weightLb)
    .gte("max_weight_lb", weightLb)
    .limit(1);

  if (!rates?.length) return null;

  return {
    rate_per_lb: rates[0]!.rate_per_lb,
    minimum_charge: rates[0]!.minimum_charge,
  };
}

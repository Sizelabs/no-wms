"use server";

import { revalidatePath } from "next/cache";

import { getUserAgencyScope, getUserCourierScope } from "@/lib/auth/scope";
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

// ── Shipping Categories ──

export async function getShippingCategories(countryCode?: string) {
  const supabase = await createClient();

  let query = supabase
    .from("shipping_categories")
    .select("*")
    .eq("is_active", true)
    .order("country_code")
    .order("display_order");

  if (countryCode) query = query.eq("country_code", countryCode);

  const { data, error } = await query;
  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function getShippingCategory(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("shipping_categories")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function createShippingCategory(formData: FormData): Promise<{ id: string } | { error: string }> {
  const { supabase, profile } = await getAuthProfile();
  if (!profile) return { error: "No autenticado" };

  const { data, error } = await supabase
    .from("shipping_categories")
    .insert({
      organization_id: profile.organization_id,
      country_code: formData.get("country_code") as string,
      code: formData.get("code") as string,
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || null,
      display_order: parseInt(formData.get("display_order") as string) || 0,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/tariffs/categories");
  return { id: data.id };
}

export async function updateShippingCategory(id: string, formData: FormData): Promise<{ error?: string }> {
  const { supabase, profile } = await getAuthProfile();
  if (!profile) return { error: "No autenticado" };

  const updates: Record<string, unknown> = {};
  for (const field of ["country_code", "code", "name", "description"]) {
    const val = formData.get(field) as string | null;
    if (val !== null) updates[field] = val || null;
  }
  const displayOrder = formData.get("display_order") as string | null;
  if (displayOrder !== null) updates.display_order = parseInt(displayOrder) || 0;

  const isActive = formData.get("is_active");
  if (isActive !== null) updates.is_active = isActive === "true";

  const { error } = await supabase
    .from("shipping_categories")
    .update(updates)
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/tariffs/categories");
  return {};
}

export async function deleteShippingCategory(id: string): Promise<{ error?: string }> {
  const { supabase, profile } = await getAuthProfile();
  if (!profile) return { error: "No autenticado" };

  const { error } = await supabase
    .from("shipping_categories")
    .update({ is_active: false })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/tariffs/categories");
  return {};
}

// ── Tariff Schedules ──

export async function getTariffSchedules(filters?: {
  tariff_side?: string;
  tariff_type?: string;
  courier_id?: string;
  agency_id?: string;
  destination_id?: string;
  is_active?: boolean;
}) {
  const supabase = await createClient();
  const [courierScope, agencyScope] = await Promise.all([
    getUserCourierScope(),
    getUserAgencyScope(),
  ]);

  let query = supabase
    .from("tariff_schedules")
    .select(`
      *,
      couriers:courier_id(id, name, code),
      agencies:agency_id(id, name, code),
      destinations:destination_id(id, city, country_code),
      shipping_categories:shipping_category_id(id, code, name, country_code),
      tariff_brackets(id, min_weight, max_weight, rate_per_unit, minimum_charge)
    `)
    .order("created_at", { ascending: false });

  // Scope filtering
  if (courierScope !== null && courierScope.length > 0) {
    query = query.in("courier_id", courierScope);
  } else if (courierScope !== null && courierScope.length === 0) {
    // Destination user with no courier assignments — empty result
    return { data: [], error: null };
  }

  if (agencyScope !== null && agencyScope.length > 0) {
    query = query.in("agency_id", agencyScope);
  } else if (agencyScope !== null && agencyScope.length === 0) {
    // Agency user with no agency assignments
    return { data: [], error: null };
  }

  if (filters?.tariff_side) query = query.eq("tariff_side", filters.tariff_side);
  if (filters?.tariff_type) query = query.eq("tariff_type", filters.tariff_type);
  if (filters?.courier_id) query = query.eq("courier_id", filters.courier_id);
  if (filters?.agency_id) query = query.eq("agency_id", filters.agency_id);
  if (filters?.destination_id) query = query.eq("destination_id", filters.destination_id);
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
      couriers:courier_id(id, name, code),
      agencies:agency_id(id, name, code),
      destinations:destination_id(id, city, country_code),
      shipping_categories:shipping_category_id(id, code, name, country_code),
      tariff_brackets(id, min_weight, max_weight, rate_per_unit, minimum_charge)
    `)
    .eq("id", id)
    .single();

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function createTariffSchedule(formData: FormData): Promise<{ id: string } | { error: string }> {
  const { supabase, profile } = await getAuthProfile();
  if (!profile) return { error: "No autenticado" };

  const tariffType = formData.get("tariff_type") as string;

  const { data, error } = await supabase
    .from("tariff_schedules")
    .insert({
      organization_id: profile.organization_id,
      tariff_side: formData.get("tariff_side") as string,
      tariff_type: tariffType,
      courier_id: (formData.get("courier_id") as string) || null,
      agency_id: (formData.get("agency_id") as string) || null,
      destination_id: tariffType === "shipping" ? (formData.get("destination_id") as string) : null,
      modality: tariffType === "shipping" ? (formData.get("modality") as string) || null : null,
      shipping_category_id: tariffType === "shipping" ? (formData.get("shipping_category_id") as string) || null : null,
      work_order_type: tariffType === "work_order" ? (formData.get("work_order_type") as string) : null,
      base_fee: parseFloat(formData.get("base_fee") as string) || 0,
      weight_unit: (formData.get("weight_unit") as string) || "kg",
      volumetric_divisor: (formData.get("volumetric_divisor") as string)
        ? parseFloat(formData.get("volumetric_divisor") as string)
        : null,
      currency: (formData.get("currency") as string) || "USD",
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
  const { supabase, profile } = await getAuthProfile();
  if (!profile) return { error: "No autenticado" };

  const updates: Record<string, unknown> = {};

  const stringFields = [
    "tariff_side", "tariff_type", "courier_id", "agency_id",
    "destination_id", "modality", "shipping_category_id",
    "work_order_type", "weight_unit", "currency",
    "effective_from", "effective_to",
  ];

  for (const field of stringFields) {
    const val = formData.get(field) as string | null;
    if (val !== null) updates[field] = val || null;
  }

  const numericFields = ["base_fee", "volumetric_divisor"];
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

// ── Tariff Brackets ──

export async function saveTariffBrackets(
  scheduleId: string,
  brackets: { min_weight: number; max_weight: number; rate_per_unit: number; minimum_charge: number }[],
): Promise<{ error?: string }> {
  const { supabase, profile } = await getAuthProfile();
  if (!profile) return { error: "No autenticado" };

  // Delete existing brackets
  const { error: deleteError } = await supabase
    .from("tariff_brackets")
    .delete()
    .eq("tariff_schedule_id", scheduleId);

  if (deleteError) return { error: deleteError.message };

  if (brackets.length === 0) {
    revalidatePath("/tariffs");
    return {};
  }

  // Insert new brackets
  const { error: insertError } = await supabase
    .from("tariff_brackets")
    .insert(
      brackets.map((b) => ({
        tariff_schedule_id: scheduleId,
        min_weight: b.min_weight,
        max_weight: b.max_weight,
        rate_per_unit: b.rate_per_unit,
        minimum_charge: b.minimum_charge,
      })),
    );

  if (insertError) return { error: insertError.message };
  revalidatePath("/tariffs");
  return {};
}

// ── Clone ──

export async function cloneTariffSchedule(
  scheduleId: string,
  targetCustomerId: string,
): Promise<{ id: string } | { error: string }> {
  const { supabase, profile } = await getAuthProfile();
  if (!profile) return { error: "No autenticado" };

  // Fetch source schedule with brackets
  const { data: source, error: fetchError } = await supabase
    .from("tariff_schedules")
    .select("*, tariff_brackets(*)")
    .eq("id", scheduleId)
    .single();

  if (fetchError || !source) return { error: fetchError?.message ?? "Tarifa no encontrada" };

  // Determine which customer field to set
  const customerFields =
    source.tariff_side === "forwarder_to_courier"
      ? { courier_id: targetCustomerId, agency_id: null }
      : { agency_id: targetCustomerId };

  // Create new schedule
  const { data: newSchedule, error: createError } = await supabase
    .from("tariff_schedules")
    .insert({
      organization_id: source.organization_id,
      tariff_side: source.tariff_side,
      tariff_type: source.tariff_type,
      courier_id: source.courier_id,
      destination_id: source.destination_id,
      modality: source.modality,
      shipping_category_id: source.shipping_category_id,
      work_order_type: source.work_order_type,
      base_fee: source.base_fee,
      weight_unit: source.weight_unit,
      volumetric_divisor: source.volumetric_divisor,
      currency: source.currency,
      effective_from: source.effective_from,
      effective_to: source.effective_to,
      ...customerFields,
    })
    .select("id")
    .single();

  if (createError || !newSchedule) return { error: createError?.message ?? "Error al clonar" };

  // Copy brackets
  const brackets = source.tariff_brackets as {
    min_weight: number;
    max_weight: number;
    rate_per_unit: number;
    minimum_charge: number;
  }[];

  if (brackets?.length) {
    const { error: bracketError } = await supabase
      .from("tariff_brackets")
      .insert(
        brackets.map((b) => ({
          tariff_schedule_id: newSchedule.id,
          min_weight: b.min_weight,
          max_weight: b.max_weight,
          rate_per_unit: b.rate_per_unit,
          minimum_charge: b.minimum_charge,
        })),
      );

    if (bracketError) return { error: bracketError.message };
  }

  revalidatePath("/tariffs");
  return { id: newSchedule.id };
}

// ── Tariff Lookup ──

export async function getApplicableTariff(params: {
  tariff_side: string;
  customer_id: string;
  courier_id?: string;
  tariff_type: string;
  destination_id?: string;
  modality?: string;
  category_id?: string;
  work_order_type?: string;
  weight: number;
}) {
  const { supabase, profile } = await getAuthProfile();
  if (!profile) return null;

  const { data, error } = await supabase.rpc("get_applicable_tariff", {
    p_org_id: profile.organization_id,
    p_tariff_side: params.tariff_side,
    p_customer_id: params.customer_id,
    p_courier_id: params.courier_id ?? null,
    p_tariff_type: params.tariff_type,
    p_destination_id: params.destination_id ?? null,
    p_modality: params.modality ?? null,
    p_category_id: params.category_id ?? null,
    p_work_order_type: params.work_order_type ?? null,
    p_weight: params.weight,
  });

  if (error || !data?.length) return null;

  return {
    schedule_id: data[0].schedule_id as string,
    base_fee: data[0].base_fee as number,
    rate_per_unit: data[0].rate_per_unit as number,
    minimum_charge: data[0].minimum_charge as number,
    weight_unit: data[0].weight_unit as string,
    currency: data[0].currency as string,
  };
}

/**
 * Legacy compatibility: find applicable tariff rate for invoicing.
 * Calls the new tariff lookup system under the hood.
 */
export async function getApplicableTariffRate(
  orgId: string,
  agencyId: string,
  destinationId: string,
  modality: string,
  _category: string | null,
  weightKg: number,
): Promise<{ rate_per_kg: number; minimum_charge: number } | null> {
  const supabase = await createClient();

  // Use the new lookup function — find courier_to_agency tariff for this agency
  const { data, error } = await supabase.rpc("get_applicable_tariff", {
    p_org_id: orgId,
    p_tariff_side: "courier_to_agency",
    p_customer_id: agencyId,
    p_courier_id: null, // Will match any courier (base tariffs)
    p_tariff_type: "shipping",
    p_destination_id: destinationId,
    p_modality: modality,
    p_category_id: null,
    p_work_order_type: null,
    p_weight: weightKg,
  });

  if (error || !data?.length) return null;

  return {
    rate_per_kg: data[0].rate_per_unit as number,
    minimum_charge: data[0].minimum_charge as number,
  };
}

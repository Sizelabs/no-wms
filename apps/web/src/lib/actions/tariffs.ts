"use server";

import { revalidatePath } from "next/cache";

import { getActionAuth } from "@/lib/auth/action";
import { getUserCourierScope } from "@/lib/auth/scope";
import { createClient } from "@/lib/supabase/server";

// ── Handling Costs ──

export async function getHandlingCosts() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("handling_costs")
    .select("id, name, description, is_active, display_order, base_rate, base_rate_unit, base_minimum_charge")
    .order("display_order")
    .order("name");

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function getHandlingCostsWithTariffs(courierId?: string) {
  const supabase = await createClient();

  const { data: costs, error: costsError } = await supabase
    .from("handling_costs")
    .select("id, name, description, is_active, display_order, base_rate, base_rate_unit, base_minimum_charge")
    .order("display_order")
    .order("name");

  if (costsError) return { data: null, error: costsError.message };

  if (!courierId) {
    return {
      data: (costs ?? []).map((c) => ({
        ...c,
        rate: Number(c.base_rate),
        rate_unit: c.base_rate_unit,
        minimum_charge: c.base_minimum_charge != null ? Number(c.base_minimum_charge) : null,
        is_custom: false,
      })),
      error: null,
    };
  }

  const { data: tariffs, error: tariffsError } = await supabase
    .from("courier_tariffs")
    .select("handling_cost_id, rate, rate_unit, minimum_charge")
    .eq("courier_id", courierId);

  if (tariffsError) return { data: null, error: tariffsError.message };

  const tariffMap = new Map(
    (tariffs ?? []).map((t) => [t.handling_cost_id, t]),
  );

  return {
    data: (costs ?? []).map((c) => {
      const override = tariffMap.get(c.id);
      if (override) {
        const isCustom =
          Number(override.rate) !== Number(c.base_rate) ||
          override.rate_unit !== c.base_rate_unit ||
          Number(override.minimum_charge ?? 0) !== Number(c.base_minimum_charge ?? 0);
        return {
          ...c,
          rate: Number(override.rate),
          rate_unit: override.rate_unit,
          minimum_charge: override.minimum_charge != null ? Number(override.minimum_charge) : null,
          is_custom: isCustom,
        };
      }
      return {
        ...c,
        rate: Number(c.base_rate),
        rate_unit: c.base_rate_unit,
        minimum_charge: c.base_minimum_charge != null ? Number(c.base_minimum_charge) : null,
        is_custom: false,
      };
    }),
    error: null,
  };
}

export async function getHandlingCost(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("handling_costs")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function createHandlingCost(formData: FormData): Promise<{ id: string } | { error: string }> {
  const auth = await getActionAuth();
  if (!auth) return { error: "No autenticado" };

  const baseRate = formData.get("base_rate") as string | null;
  const baseRateUnit = formData.get("base_rate_unit") as string | null;
  const baseMinCharge = formData.get("base_minimum_charge") as string | null;

  const { data, error } = await auth.supabase
    .from("handling_costs")
    .insert({
      organization_id: auth.organizationId,
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || null,
      ...(baseRate ? { base_rate: parseFloat(baseRate) } : {}),
      ...(baseRateUnit ? { base_rate_unit: baseRateUnit } : {}),
      ...(baseMinCharge ? { base_minimum_charge: parseFloat(baseMinCharge) } : {}),
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") return { error: "Ya existe un costo de manejo con ese nombre" };
    return { error: error.message };
  }
  revalidatePath("/settings/handling-costs");
  return { id: data.id };
}

export async function updateHandlingCost(id: string, formData: FormData): Promise<{ error?: string }> {
  const auth = await getActionAuth();
  if (!auth) return { error: "No autenticado" };

  const updates: Record<string, unknown> = {};
  for (const field of ["name", "description"]) {
    const val = formData.get(field) as string | null;
    if (val !== null) updates[field] = val || null;
  }
  const isActive = formData.get("is_active");
  if (isActive !== null) updates.is_active = isActive === "true";

  // Base tariff fields
  const baseRate = formData.get("base_rate") as string | null;
  if (baseRate !== null && baseRate !== "") updates.base_rate = parseFloat(baseRate);
  const baseRateUnit = formData.get("base_rate_unit") as string | null;
  if (baseRateUnit) updates.base_rate_unit = baseRateUnit;
  const baseMinCharge = formData.get("base_minimum_charge") as string | null;
  if (baseMinCharge !== null) updates.base_minimum_charge = baseMinCharge ? parseFloat(baseMinCharge) : null;

  const { error } = await auth.supabase
    .from("handling_costs")
    .update(updates)
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/settings/handling-costs");
  return {};
}

export async function updateCourierTariff(
  courierId: string,
  handlingCostId: string,
  data: { rate: number; rate_unit: string; minimum_charge: number | null },
): Promise<{ error?: string }> {
  const auth = await getActionAuth();
  if (!auth) return { error: "No autenticado" };

  const { error } = await auth.supabase
    .from("courier_tariffs")
    .upsert(
      {
        organization_id: auth.organizationId,
        courier_id: courierId,
        handling_cost_id: handlingCostId,
        rate: data.rate,
        rate_unit: data.rate_unit,
        minimum_charge: data.minimum_charge,
      },
      { onConflict: "courier_id,handling_cost_id" },
    );

  if (error) return { error: error.message };
  revalidatePath("/settings/handling-costs");
  return {};
}

export async function resetCourierTariff(
  courierId: string,
  handlingCostId: string,
): Promise<{ error?: string }> {
  const auth = await getActionAuth();
  if (!auth) return { error: "No autenticado" };

  // Get base values
  const { data: hc, error: hcError } = await auth.supabase
    .from("handling_costs")
    .select("base_rate, base_rate_unit, base_minimum_charge")
    .eq("id", handlingCostId)
    .single();

  if (hcError || !hc) return { error: hcError?.message ?? "No encontrado" };

  const { error } = await auth.supabase
    .from("courier_tariffs")
    .update({
      rate: hc.base_rate,
      rate_unit: hc.base_rate_unit,
      minimum_charge: hc.base_minimum_charge,
    })
    .eq("courier_id", courierId)
    .eq("handling_cost_id", handlingCostId);

  if (error) return { error: error.message };
  revalidatePath("/settings/handling-costs");
  return {};
}

export async function deleteHandlingCost(id: string): Promise<{ error?: string }> {
  const auth = await getActionAuth();
  if (!auth) return { error: "No autenticado" };

  const { error } = await auth.supabase
    .from("handling_costs")
    .update({ is_active: false })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/settings/handling-costs");
  return {};
}

export async function reorderHandlingCosts(ids: string[]): Promise<{ error?: string }> {
  const auth = await getActionAuth();
  if (!auth) return { error: "No autenticado" };

  for (let i = 0; i < ids.length; i++) {
    const { error } = await auth.supabase
      .from("handling_costs")
      .update({ display_order: i + 1 })
      .eq("id", ids[i]);
    if (error) return { error: error.message };
  }

  revalidatePath("/settings/handling-costs");
  return {};
}

// ── Modalities ──

export async function getModalities() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("modalities")
    .select("id, name, code, description, is_active, display_order, base_rate, base_rate_unit, base_minimum_charge")
    .order("display_order")
    .order("name");

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function getModalitiesWithTariffs(courierId?: string) {
  const supabase = await createClient();

  const { data: modalities, error: modError } = await supabase
    .from("modalities")
    .select("id, name, code, description, is_active, display_order, base_rate, base_rate_unit, base_minimum_charge")
    .order("display_order")
    .order("name");

  if (modError) return { data: null, error: modError.message };

  if (!courierId) {
    return {
      data: (modalities ?? []).map((m) => ({
        ...m,
        rate: Number(m.base_rate),
        rate_unit: m.base_rate_unit,
        minimum_charge: m.base_minimum_charge != null ? Number(m.base_minimum_charge) : null,
        is_custom: false,
      })),
      error: null,
    };
  }

  const { data: tariffs, error: tariffsError } = await supabase
    .from("courier_modality_tariffs")
    .select("modality_id, rate, rate_unit, minimum_charge")
    .eq("courier_id", courierId);

  if (tariffsError) return { data: null, error: tariffsError.message };

  const tariffMap = new Map(
    (tariffs ?? []).map((t) => [t.modality_id, t]),
  );

  return {
    data: (modalities ?? []).map((m) => {
      const override = tariffMap.get(m.id);
      if (override) {
        const isCustom =
          Number(override.rate) !== Number(m.base_rate) ||
          override.rate_unit !== m.base_rate_unit ||
          Number(override.minimum_charge ?? 0) !== Number(m.base_minimum_charge ?? 0);
        return {
          ...m,
          rate: Number(override.rate),
          rate_unit: override.rate_unit,
          minimum_charge: override.minimum_charge != null ? Number(override.minimum_charge) : null,
          is_custom: isCustom,
        };
      }
      return {
        ...m,
        rate: Number(m.base_rate),
        rate_unit: m.base_rate_unit,
        minimum_charge: m.base_minimum_charge != null ? Number(m.base_minimum_charge) : null,
        is_custom: false,
      };
    }),
    error: null,
  };
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
  const auth = await getActionAuth();
  if (!auth) return { error: "No autenticado" };

  const baseRate = formData.get("base_rate") as string | null;
  const baseRateUnit = formData.get("base_rate_unit") as string | null;
  const baseMinCharge = formData.get("base_minimum_charge") as string | null;

  const { data, error } = await auth.supabase
    .from("modalities")
    .insert({
      organization_id: auth.organizationId,
      name: formData.get("name") as string,
      code: formData.get("code") as string,
      description: (formData.get("description") as string) || null,
      ...(baseRate ? { base_rate: parseFloat(baseRate) } : {}),
      ...(baseRateUnit ? { base_rate_unit: baseRateUnit } : {}),
      ...(baseMinCharge ? { base_minimum_charge: parseFloat(baseMinCharge) } : {}),
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
  const auth = await getActionAuth();
  if (!auth) return { error: "No autenticado" };

  const updates: Record<string, unknown> = {};
  for (const field of ["name", "code", "description"]) {
    const val = formData.get(field) as string | null;
    if (val !== null) updates[field] = val || null;
  }
  const isActive = formData.get("is_active");
  if (isActive !== null) updates.is_active = isActive === "true";

  // Base tariff fields
  const baseRate = formData.get("base_rate") as string | null;
  if (baseRate !== null && baseRate !== "") updates.base_rate = parseFloat(baseRate);
  const baseRateUnit = formData.get("base_rate_unit") as string | null;
  if (baseRateUnit) updates.base_rate_unit = baseRateUnit;
  const baseMinCharge = formData.get("base_minimum_charge") as string | null;
  if (baseMinCharge !== null) updates.base_minimum_charge = baseMinCharge ? parseFloat(baseMinCharge) : null;

  const { error } = await auth.supabase
    .from("modalities")
    .update(updates)
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/settings/modalities");
  return {};
}

export async function deleteModality(id: string): Promise<{ error?: string }> {
  const auth = await getActionAuth();
  if (!auth) return { error: "No autenticado" };

  const { error } = await auth.supabase
    .from("modalities")
    .update({ is_active: false })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/settings/modalities");
  return {};
}

export async function updateCourierModalityTariff(
  courierId: string,
  modalityId: string,
  data: { rate: number; rate_unit: string; minimum_charge: number | null },
): Promise<{ error?: string }> {
  const auth = await getActionAuth();
  if (!auth) return { error: "No autenticado" };

  const { error } = await auth.supabase
    .from("courier_modality_tariffs")
    .upsert(
      {
        organization_id: auth.organizationId,
        courier_id: courierId,
        modality_id: modalityId,
        rate: data.rate,
        rate_unit: data.rate_unit,
        minimum_charge: data.minimum_charge,
      },
      { onConflict: "courier_id,modality_id" },
    );

  if (error) return { error: error.message };
  revalidatePath("/settings/modalities");
  return {};
}

export async function resetCourierModalityTariff(
  courierId: string,
  modalityId: string,
): Promise<{ error?: string }> {
  const auth = await getActionAuth();
  if (!auth) return { error: "No autenticado" };

  const { data: mod, error: modError } = await auth.supabase
    .from("modalities")
    .select("base_rate, base_rate_unit, base_minimum_charge")
    .eq("id", modalityId)
    .single();

  if (modError || !mod) return { error: modError?.message ?? "No encontrado" };

  const { error } = await auth.supabase
    .from("courier_modality_tariffs")
    .update({
      rate: mod.base_rate,
      rate_unit: mod.base_rate_unit,
      minimum_charge: mod.base_minimum_charge,
    })
    .eq("courier_id", courierId)
    .eq("modality_id", modalityId);

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
  const auth = await getActionAuth();
  if (!auth) return { error: "No autenticado" };

  const { error } = await auth.supabase
    .from("warehouse_destination_modalities")
    .upsert(
      {
        organization_id: auth.organizationId,
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
  handling_cost_id?: string;
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
      handling_costs:handling_cost_id(id, name),
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
  if (filters?.handling_cost_id) query = query.eq("handling_cost_id", filters.handling_cost_id);
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
      handling_costs:handling_cost_id(id, name),
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
  const auth = await getActionAuth();
  if (!auth) return { error: "No autenticado" };

  const { data, error } = await auth.supabase
    .from("tariff_schedules")
    .insert({
      organization_id: auth.organizationId,
      warehouse_id: formData.get("warehouse_id") as string,
      handling_cost_id: formData.get("handling_cost_id") as string,
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
  const auth = await getActionAuth();
  if (!auth) return { error: "No autenticado" };

  const updates: Record<string, unknown> = {};

  const stringFields = [
    "warehouse_id", "handling_cost_id", "destination_id",
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

  const { error } = await auth.supabase
    .from("tariff_schedules")
    .update(updates)
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/tariffs");
  return {};
}

export async function deleteTariffSchedule(id: string): Promise<{ error?: string }> {
  const auth = await getActionAuth();
  if (!auth) return { error: "No autenticado" };

  const { error } = await auth.supabase
    .from("tariff_schedules")
    .update({ is_active: false })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/tariffs");
  return {};
}

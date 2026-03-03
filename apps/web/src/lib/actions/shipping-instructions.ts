"use server";

import { revalidatePath } from "next/cache";

import { getUserAgencyScope, getUserWarehouseScope } from "@/lib/auth/scope";
import { createClient } from "@/lib/supabase/server";

export async function createShippingInstruction(formData: FormData): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autenticado" };

  const wrIds = JSON.parse(formData.get("warehouse_receipt_ids") as string) as string[];

  if (!wrIds.length) return { error: "Seleccione al menos un WR" };

  // Block WRs with active WOs
  const { data: activeWoItems } = await supabase
    .from("work_order_items")
    .select("warehouse_receipt_id, work_orders!inner(status)")
    .in("warehouse_receipt_id", wrIds)
    .in("work_orders.status", ["requested", "approved", "in_progress"]);

  if (activeWoItems?.length) {
    return { error: "Uno o más WRs tienen órdenes de trabajo activas. Cancele las OT primero." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile) return { error: "Perfil no encontrado" };

  // Generate SI number
  const { count } = await supabase
    .from("shipping_instructions")
    .select("*", { count: "exact", head: true });

  const siNumber = `SI${String((count ?? 0) + 1).padStart(5, "0")}`;

  const { data: si, error } = await supabase
    .from("shipping_instructions")
    .insert({
      organization_id: profile.organization_id,
      warehouse_id: formData.get("warehouse_id") as string,
      si_number: siNumber,
      agency_id: formData.get("agency_id") as string,
      destination_country_id: formData.get("destination_country_id") as string,
      modality: formData.get("modality") as string,
      courier_category: (formData.get("courier_category") as string) || null,
      consignee_id: formData.get("consignee_id") as string,
      destination_city: (formData.get("destination_city") as string) || null,
      insure_cargo: formData.get("insure_cargo") === "true",
      is_dgr: formData.get("is_dgr") === "true",
      cedula_ruc: (formData.get("cedula_ruc") as string) || null,
      cupo_4x4_used: formData.get("cupo_4x4_used") === "true",
      special_instructions: (formData.get("special_instructions") as string) || null,
      sed_validation_data: formData.get("sed_validation_data")
        ? JSON.parse(formData.get("sed_validation_data") as string)
        : null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  // Insert SI items
  const items = wrIds.map((wrId) => ({
    shipping_instruction_id: si.id,
    warehouse_receipt_id: wrId,
  }));

  await supabase.from("shipping_instruction_items").insert(items);

  // Update WR statuses to in_dispatch
  await supabase
    .from("warehouse_receipts")
    .update({ status: "in_dispatch" })
    .in("id", wrIds);

  // Record status history
  await supabase.from("shipping_instruction_status_history").insert({
    organization_id: profile.organization_id,
    shipping_instruction_id: si.id,
    old_status: null,
    new_status: "requested",
    changed_by: user.id,
  });

  revalidatePath("/shipping");
  revalidatePath("/inventory");

  return { id: si.id };
}

export async function getShippingInstructions(filters?: {
  status?: string;
  agency_id?: string;
  modality?: string;
}) {
  const supabase = await createClient();
  const [warehouseScope, agencyScope] = await Promise.all([
    getUserWarehouseScope(),
    getUserAgencyScope(),
  ]);

  if (warehouseScope !== null && warehouseScope.length === 0) {
    return { data: [], error: null };
  }
  if (agencyScope !== null && agencyScope.length === 0) {
    return { data: [], error: null };
  }

  let query = supabase
    .from("shipping_instructions")
    .select("*, agencies(name, code), consignees(name), hawbs(hawb_number), shipping_instruction_items(warehouse_receipt_id)")
    .order("created_at", { ascending: false });

  if (warehouseScope !== null) {
    query = query.in("warehouse_id", warehouseScope);
  }
  if (agencyScope !== null) {
    query = query.in("agency_id", agencyScope);
  }

  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.agency_id) query = query.eq("agency_id", filters.agency_id);
  if (filters?.modality) query = query.eq("modality", filters.modality);

  const { data, error } = await query;

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function getShippingInstruction(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("shipping_instructions")
    .select("*, agencies(name, code), consignees(name), hawbs(*), shipping_instruction_items(*, warehouse_receipts(wr_number, total_billable_weight_lb, packages(tracking_number, carrier)))")
    .eq("id", id)
    .single();

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function approveShippingInstruction(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: si } = await supabase
    .from("shipping_instructions")
    .select("status, organization_id")
    .eq("id", id)
    .single();

  if (!si) return { error: "SI no encontrada" };
  if (si.status !== "requested") return { error: "Solo se pueden aprobar SIs en estado 'Solicitada'" };

  await supabase
    .from("shipping_instructions")
    .update({ status: "approved", approved_by: user.id, approved_at: new Date().toISOString() })
    .eq("id", id);

  await supabase.from("shipping_instruction_status_history").insert({
    organization_id: si.organization_id,
    shipping_instruction_id: id,
    old_status: "requested",
    new_status: "approved",
    changed_by: user.id,
  });

  revalidatePath("/shipping");
  return {};
}

export async function rejectShippingInstruction(id: string, reason: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: si } = await supabase
    .from("shipping_instructions")
    .select("status, organization_id, shipping_instruction_items(warehouse_receipt_id)")
    .eq("id", id)
    .single();

  if (!si) return { error: "SI no encontrada" };

  await supabase
    .from("shipping_instructions")
    .update({ status: "rejected", rejection_reason: reason })
    .eq("id", id);

  // Return WRs to in_warehouse
  const wrIds = si.shipping_instruction_items?.map((i: { warehouse_receipt_id: string }) => i.warehouse_receipt_id) ?? [];
  if (wrIds.length) {
    await supabase.from("warehouse_receipts").update({ status: "in_warehouse" }).in("id", wrIds);
  }

  await supabase.from("shipping_instruction_status_history").insert({
    organization_id: si.organization_id,
    shipping_instruction_id: id,
    old_status: si.status,
    new_status: "rejected",
    changed_by: user.id,
    reason,
  });

  revalidatePath("/shipping");
  revalidatePath("/inventory");
  return {};
}

export async function finalizeShippingInstruction(id: string): Promise<{ hawb_number?: string; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: si } = await supabase
    .from("shipping_instructions")
    .select("status, organization_id, shipping_instruction_items(warehouse_receipt_id, warehouse_receipts(total_billable_weight_lb))")
    .eq("id", id)
    .single();

  if (!si) return { error: "SI no encontrada" };
  if (si.status !== "approved") return { error: "Solo se pueden finalizar SIs aprobadas" };

  // Generate HAWB number
  const { count } = await supabase
    .from("hawbs")
    .select("*", { count: "exact", head: true });

  const hawbNumber = `GLP${String((count ?? 0) + 1).padStart(5, "0")}`;

  // Calculate totals from items
  const items = si.shipping_instruction_items ?? [];
  const totalPieces = items.length;
  const totalWeight = items.reduce((sum: number, i: any) => sum + (i.warehouse_receipts?.total_billable_weight_lb ?? 0), 0);

  // Create HAWB
  const { data: hawb } = await supabase
    .from("hawbs")
    .insert({
      organization_id: si.organization_id,
      shipping_instruction_id: id,
      hawb_number: hawbNumber,
      pieces: totalPieces,
      weight_lb: totalWeight,
    })
    .select("id")
    .single();

  // Set hawb_id on all WRs in this SI
  if (hawb) {
    const wrIds = items.map((i: any) => i.warehouse_receipt_id).filter(Boolean) as string[];
    if (wrIds.length) {
      await supabase
        .from("warehouse_receipts")
        .update({ hawb_id: hawb.id })
        .in("id", wrIds);
    }
  }

  // Update SI totals and status
  await supabase
    .from("shipping_instructions")
    .update({
      status: "finalized",
      total_pieces: totalPieces,
      total_billable_weight_lb: totalWeight,
    })
    .eq("id", id);

  await supabase.from("shipping_instruction_status_history").insert({
    organization_id: si.organization_id,
    shipping_instruction_id: id,
    old_status: "approved",
    new_status: "finalized",
    changed_by: user.id,
  });

  revalidatePath("/shipping");
  return { hawb_number: hawbNumber };
}

export async function getDestinationCountries() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("destination_countries")
    .select("id, name, code")
    .eq("is_active", true)
    .order("name");

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function getCourierCategories(countryId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("courier_categories")
    .select("id, code, name, max_weight_lb, max_value_usd, description")
    .eq("destination_country_id", countryId)
    .eq("is_active", true)
    .order("code");

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function addAdditionalCharges(
  siId: string,
  charges: Array<{ description: string; amount: number }>,
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("shipping_instructions")
    .update({ additional_charges: charges })
    .eq("id", siId);

  if (error) return { error: error.message };

  revalidatePath("/shipping");
  return {};
}

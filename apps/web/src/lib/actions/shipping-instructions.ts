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

  // Fetch profile and check for active WOs in parallel
  const [{ data: activeWoItems }, { data: profile }] = await Promise.all([
    supabase
      .from("work_order_items")
      .select("warehouse_receipt_id, work_orders!inner(status)")
      .in("warehouse_receipt_id", wrIds)
      .in("work_orders.status", ["requested", "approved", "in_progress"]),
    supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single(),
  ]);

  if (activeWoItems?.length) {
    return { error: "Uno o más WRs tienen órdenes de trabajo activas. Cancele las OT primero." };
  }
  if (!profile) return { error: "Perfil no encontrado" };

  // Generate SI number, fetch WR totals, and fetch shipping category in parallel
  const shippingCategoryId = formData.get("shipping_category_id") as string | null;

  const [{ data: siNumber }, { data: wrs }, categoryResult] = await Promise.all([
    supabase.rpc("next_si_number", { p_org_id: profile.organization_id }),
    supabase
      .from("warehouse_receipts")
      .select("id, total_billable_weight_lb, total_actual_weight_lb, total_volumetric_weight_lb, total_declared_value_usd, total_pieces, has_dgr_package")
      .in("id", wrIds),
    shippingCategoryId
      ? supabase
          .from("shipping_categories")
          .select("*, shipping_category_required_documents(*)")
          .eq("id", shippingCategoryId)
          .single()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (!siNumber) return { error: "No se pudo generar número de SI" };

  const totalPieces = (wrs ?? []).reduce((s, w) => s + (w.total_pieces ?? 0), 0);
  const totalActual = (wrs ?? []).reduce((s, w) => s + Number(w.total_actual_weight_lb ?? 0), 0);
  const totalVolumetric = (wrs ?? []).reduce((s, w) => s + Number(w.total_volumetric_weight_lb ?? 0), 0);
  const totalBillable = (wrs ?? []).reduce((s, w) => s + Number(w.total_billable_weight_lb ?? 0), 0);
  const totalDeclared = (wrs ?? []).reduce((s, w) => s + Number(w.total_declared_value_usd ?? 0), 0);

  // Server-side category validation
  const category = categoryResult?.data;
  if (category) {
    const totalWeightKg = totalBillable * 0.453592;

    if (category.max_weight_kg !== null && totalWeightKg > Number(category.max_weight_kg)) {
      return { error: `Peso total (${totalWeightKg.toFixed(1)} kg) excede el máximo de la categoría ${category.code} (${category.max_weight_kg} kg)` };
    }
    if (category.max_declared_value_usd !== null && totalDeclared > Number(category.max_declared_value_usd)) {
      return { error: `Valor declarado ($${totalDeclared.toFixed(2)}) excede el máximo de la categoría ${category.code} ($${category.max_declared_value_usd})` };
    }
    if (category.min_declared_value_usd !== null && totalDeclared < Number(category.min_declared_value_usd)) {
      return { error: `Valor declarado ($${totalDeclared.toFixed(2)}) es menor al mínimo de la categoría ${category.code} ($${category.min_declared_value_usd})` };
    }
    if (category.cargo_type === "documents_only" && totalDeclared > 0) {
      return { error: "Categoría de solo documentos no permite valor comercial declarado" };
    }
    const hasDgr = (wrs ?? []).some((w) => w.has_dgr_package === true);
    if (hasDgr && !category.allows_dgr) {
      return { error: "Contiene paquetes DGR — use Categoría D" };
    }

    // Validate required documents
    const requiredDocs = (category.shipping_category_required_documents ?? []).filter(
      (d: { is_required: boolean }) => d.is_required,
    );
    if (requiredDocs.length > 0) {
      const submittedDocs = formData.get("documents")
        ? (JSON.parse(formData.get("documents") as string) as Array<{ document_type: string }>)
        : [];
      const submittedTypes = new Set(submittedDocs.map((d) => d.document_type));
      for (const rd of requiredDocs) {
        if (!submittedTypes.has((rd as { document_type: string }).document_type)) {
          return { error: `Documento requerido faltante: ${(rd as { label: string }).label}` };
        }
      }
    }
  }

  // Build category snapshot
  const categorySnapshot = category
    ? {
        code: category.code,
        name: category.name,
        max_weight_kg: category.max_weight_kg,
        min_declared_value_usd: category.min_declared_value_usd,
        max_declared_value_usd: category.max_declared_value_usd,
        cargo_type: category.cargo_type,
        allows_dgr: category.allows_dgr,
        requires_cedula: category.requires_cedula,
        requires_ruc: category.requires_ruc,
        customs_declaration_type: category.customs_declaration_type,
        country_specific_rules: category.country_specific_rules,
        required_documents: (category.shipping_category_required_documents ?? []).map(
          (d: { document_type: string; label: string; is_required: boolean }) => ({
            document_type: d.document_type,
            label: d.label,
            is_required: d.is_required,
          }),
        ),
      }
    : null;

  // Auto-set cupo_4x4_used if category consumes it
  let cupo4x4Used = formData.get("cupo_4x4_used") === "true";
  if (category?.country_specific_rules && typeof category.country_specific_rules === "object") {
    const rules = category.country_specific_rules as Record<string, unknown>;
    if (rules.consumes_cupo_4x4) cupo4x4Used = true;
  }

  const { data: si, error } = await supabase
    .from("shipping_instructions")
    .insert({
      organization_id: profile.organization_id,
      warehouse_id: formData.get("warehouse_id") as string,
      si_number: siNumber,
      agency_id: formData.get("agency_id") as string,
      destination_id: formData.get("destination_id") as string,
      modality: formData.get("modality") as string,
      courier_category: (formData.get("courier_category") as string) || null,
      shipping_category_id: shippingCategoryId || null,
      category_snapshot: categorySnapshot,
      consignee_id: formData.get("consignee_id") as string,
      destination_city: (formData.get("destination_city") as string) || null,
      insure_cargo: formData.get("insure_cargo") === "true",
      is_dgr: formData.get("is_dgr") === "true",
      cedula_ruc: (formData.get("cedula_ruc") as string) || null,
      cupo_4x4_used: cupo4x4Used,
      special_instructions: (formData.get("special_instructions") as string) || null,
      sed_validation_data: formData.get("sed_validation_data")
        ? JSON.parse(formData.get("sed_validation_data") as string)
        : null,
      total_pieces: totalPieces,
      total_actual_weight_lb: totalActual,
      total_volumetric_weight_lb: totalVolumetric,
      total_billable_weight_lb: totalBillable,
      total_declared_value_usd: totalDeclared,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  // Insert SI items, update WR statuses, record history, and insert documents in parallel
  const items = wrIds.map((wrId) => ({
    shipping_instruction_id: si.id,
    warehouse_receipt_id: wrId,
  }));

  await Promise.all([
    supabase.from("shipping_instruction_items").insert(items),
    supabase.from("warehouse_receipts").update({ status: "in_dispatch" }).in("id", wrIds),
    supabase.from("shipping_instruction_status_history").insert({
      organization_id: profile.organization_id,
      shipping_instruction_id: si.id,
      old_status: null,
      new_status: "requested",
      changed_by: user.id,
    }),
  ]);

  // Insert uploaded documents
  const docsJson = formData.get("documents") as string;
  if (docsJson) {
    const docs = JSON.parse(docsJson) as Array<{
      document_type: string;
      storage_path: string;
      file_name: string;
      content_type: string;
      file_size?: number;
    }>;
    if (docs.length > 0) {
      await supabase.from("shipping_instruction_documents").insert(
        docs.map((d) => ({
          organization_id: profile.organization_id,
          shipping_instruction_id: si.id,
          document_type: d.document_type,
          storage_path: d.storage_path,
          file_name: d.file_name,
          content_type: d.content_type,
          file_size: d.file_size ?? null,
          uploaded_by: user.id,
        })),
      );
    }
  }

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
    .select("*, agencies(name, code), consignees(full_name), hawbs(hawb_number), shipping_instruction_items(warehouse_receipt_id, warehouse_receipts(total_billable_weight_lb))")
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
    .select("*, agencies(name, code), consignees(full_name), hawbs(*), shipping_categories(code, name), shipping_instruction_documents(*), shipping_instruction_items(*, warehouse_receipts(wr_number, total_billable_weight_lb, packages(tracking_number, carrier)))")
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

  // Generate HAWB number via SECURITY DEFINER function (bypasses RLS)
  const { data: hawbNumber } = await supabase.rpc("next_hawb_number", { p_org_id: si.organization_id });

  if (!hawbNumber) return { error: "No se pudo generar número HAWB" };

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

export async function getDestinations() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("destinations")
    .select("id, city, country_code")
    .eq("is_active", true)
    .order("city");

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

/** Active destinations served by at least one courier. */
export async function getAgencyDestinations(_agencyId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("destinations")
    .select("id, city, state, country_code, courier_destinations!inner(courier_id)")
    .eq("is_active", true)
    .eq("courier_destinations.is_active", true)
    .order("city");

  if (error) return { data: null, error: error.message };

  // Strip join artifacts and deduplicate
  const seen = new Set<string>();
  const destinations = (data ?? [])
    .filter((d) => {
      if (seen.has(d.id)) return false;
      seen.add(d.id);
      return true;
    })
    .map(({ id, city, state, country_code }) => ({ id, city, state, country_code }));

  return { data: destinations, error: null };
}

export async function getShippingCategories(countryCode: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("shipping_categories")
    .select("*, shipping_category_required_documents(*)")
    .eq("country_code", countryCode)
    .eq("is_active", true)
    .order("display_order");

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

/** @deprecated Use getShippingCategories instead */
export async function getCourierCategories(countryCode: string) {
  return getShippingCategories(countryCode);
}

export async function getAvailableWrsForShipping() {
  const supabase = await createClient();
  const [warehouseScope, agencyScope] = await Promise.all([
    getUserWarehouseScope(),
    getUserAgencyScope(),
  ]);

  if ((warehouseScope !== null && warehouseScope.length === 0) ||
      (agencyScope !== null && agencyScope.length === 0)) {
    return { data: [] };
  }

  let query = supabase
    .from("warehouse_receipts")
    .select("id, wr_number, warehouse_id, agency_id, consignee_id, status, total_billable_weight_lb, total_declared_value_usd, total_packages, total_pieces, has_dgr_package, has_damaged_package, consignees(full_name, casillero)")
    .in("status", ["received", "in_warehouse"])
    .order("received_at", { ascending: false })
    .limit(500);

  if (warehouseScope !== null) query = query.in("warehouse_id", warehouseScope);
  if (agencyScope !== null) query = query.in("agency_id", agencyScope);

  const { data } = await query;
  return { data: data ?? [] };
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

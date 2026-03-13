"use server";

import { ROLES } from "@no-wms/shared/constants/roles";
import { revalidatePath } from "next/cache";

import type { UserRoleAssignment } from "@/lib/auth/roles";
import { getAuthUser, getCachedRoleAssignments } from "@/lib/auth/cached";
import { getUserAgencyScope, getUserCourierScope, getUserWarehouseScope } from "@/lib/auth/scope";
import { createClient } from "@/lib/supabase/server";

/** Verify the SI's agency belongs to one of the user's scoped couriers. */
async function verifyCourierScope(
  assignments: UserRoleAssignment[],
  agencyId: string,
): Promise<{ error?: string }> {
  const courierIds = assignments
    .filter((a) => a.role === ROLES.DESTINATION_ADMIN && a.courier_id)
    .map((a) => a.courier_id!);

  if (courierIds.length > 0) {
    const supabase = await createClient();
    const { data: agency } = await supabase
      .from("agencies")
      .select("id")
      .eq("id", agencyId)
      .in("courier_id", courierIds)
      .single();

    if (!agency) return { error: "No tiene permisos sobre esta agencia" };
  }

  return {};
}

export async function createShippingInstruction(formData: FormData): Promise<{ id: string; si_number: string } | { error: string }> {
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
  const modalityId = (formData.get("modality_id") as string) || null;

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
      modality: (formData.get("modality") as string) || null,
      modality_id: modalityId,
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
    .select("id, si_number")
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

  revalidatePath("/shipping-instructions");
  revalidatePath("/inventory");

  return { id: si.id, si_number: si.si_number };
}

export async function getShippingInstructions(filters?: {
  status?: string;
  agency_id?: string;
  modality?: string;
}) {
  const supabase = await createClient();
  const [warehouseScope, agencyScope, courierScope] = await Promise.all([
    getUserWarehouseScope(),
    getUserAgencyScope(),
    getUserCourierScope(),
  ]);

  if (warehouseScope !== null && warehouseScope.length === 0) {
    return { data: [], error: null };
  }
  if (agencyScope !== null && agencyScope.length === 0) {
    return { data: [], error: null };
  }

  // Courier-scoped users: resolve agency IDs belonging to their couriers
  let courierAgencyIds: string[] | null = null;
  if (courierScope !== null) {
    if (courierScope.length === 0) return { data: [], error: null };
    const { data: courierAgencies } = await supabase
      .from("agencies")
      .select("id")
      .in("courier_id", courierScope);
    courierAgencyIds = (courierAgencies ?? []).map((a: { id: string }) => a.id);
    if (courierAgencyIds.length === 0) return { data: [], error: null };
  }

  let query = supabase
    .from("shipping_instructions")
    .select("*, agencies(name, code), consignees(full_name), hawbs(id, hawb_number, document_type), modalities(id, name, code), shipping_instruction_items(warehouse_receipt_id, warehouse_receipts(total_billable_weight_lb))")
    .order("created_at", { ascending: false });

  if (warehouseScope !== null) {
    query = query.in("warehouse_id", warehouseScope);
  }
  if (agencyScope !== null) {
    query = query.in("agency_id", agencyScope);
  }
  if (courierAgencyIds !== null) {
    query = query.in("agency_id", courierAgencyIds);
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
    .select("*, agencies(name, code), consignees(full_name), hawbs(*), modalities(id, name, code), shipping_categories(code, name), shipping_instruction_documents(*), shipping_instruction_items(*, warehouse_receipts(wr_number, total_billable_weight_lb, packages(tracking_number, carrier)))")
    .eq("id", id)
    .single();

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function approveShippingInstruction(id: string): Promise<{ error?: string }> {
  const user = await getAuthUser();
  if (!user) return { error: "No autenticado" };

  // Only destination_admin (courier) can approve
  const assignments = await getCachedRoleAssignments();
  const isDestinationAdmin = assignments.some((a) => a.role === ROLES.DESTINATION_ADMIN);
  if (!isDestinationAdmin) return { error: "Solo el courier puede aprobar instrucciones de embarque" };

  const supabase = await createClient();
  const { data: si } = await supabase
    .from("shipping_instructions")
    .select("status, organization_id, agency_id")
    .eq("id", id)
    .single();

  if (!si) return { error: "SI no encontrada" };
  if (si.status !== "requested") return { error: "Solo se pueden aprobar SIs en estado 'Solicitada'" };

  const scopeCheck = await verifyCourierScope(assignments, si.agency_id);
  if (scopeCheck.error) return scopeCheck;

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

  revalidatePath("/shipping-instructions");
  return {};
}

export async function rejectShippingInstruction(id: string, reason: string): Promise<{ error?: string }> {
  const user = await getAuthUser();
  if (!user) return { error: "No autenticado" };

  // Only destination_admin (courier) can reject
  const assignments = await getCachedRoleAssignments();
  const isDestinationAdmin = assignments.some((a) => a.role === ROLES.DESTINATION_ADMIN);
  if (!isDestinationAdmin) return { error: "Solo el courier puede rechazar instrucciones de embarque" };

  const supabase = await createClient();
  const { data: si } = await supabase
    .from("shipping_instructions")
    .select("status, organization_id, agency_id, shipping_instruction_items(warehouse_receipt_id)")
    .eq("id", id)
    .single();

  if (!si) return { error: "SI no encontrada" };

  const scopeCheck = await verifyCourierScope(assignments, si.agency_id);
  if (scopeCheck.error) return scopeCheck;

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

  revalidatePath("/shipping-instructions");
  revalidatePath("/inventory");
  return {};
}

export async function finalizeShippingInstruction(id: string): Promise<{ error?: string }> {
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

  // Calculate totals from items
  const items = si.shipping_instruction_items ?? [];
  const totalPieces = items.length;
  const totalWeight = items.reduce((sum: number, i: any) => sum + (i.warehouse_receipts?.total_billable_weight_lb ?? 0), 0);

  // Update SI totals and status (HAWB generated later when assigned to shipment)
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

  revalidatePath("/shipping-instructions");
  return {};
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

/** Active destinations served by at least one courier, with available modalities. */
export async function getAgencyDestinations(_agencyId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("destinations")
    .select("id, city, state, country_code, courier_destinations!inner(courier_id, modality_id, modalities(id, name, code))")
    .eq("is_active", true)
    .eq("courier_destinations.is_active", true)
    .order("city");

  if (error) return { data: null, error: error.message };

  // Deduplicate destinations and collect distinct modalities per destination
  const destMap = new Map<string, {
    id: string;
    city: string;
    state: string | null;
    country_code: string;
    modalities: { id: string; name: string; code: string }[];
  }>();

  for (const d of data ?? []) {
    if (!destMap.has(d.id)) {
      destMap.set(d.id, { id: d.id, city: d.city, state: d.state, country_code: d.country_code, modalities: [] });
    }
    const dest = destMap.get(d.id)!;
    const cds = d.courier_destinations as unknown as Array<{ modality_id: string; modalities: { id: string; name: string; code: string } | null }>;
    for (const cd of cds) {
      if (cd.modalities && !dest.modalities.some((m) => m.id === cd.modalities!.id)) {
        dest.modalities.push(cd.modalities);
      }
    }
  }

  return { data: Array.from(destMap.values()), error: null };
}

export async function getShippingCategories(countryCode: string, modalityId?: string) {
  const supabase = await createClient();

  let query = supabase
    .from("shipping_categories")
    .select("*, shipping_category_required_documents(*)")
    .eq("country_code", countryCode)
    .eq("is_active", true)
    .order("display_order");

  if (modalityId) {
    query = query.eq("modality_id", modalityId);
  }

  const { data, error } = await query;

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

/** Fetch distinct modalities available for a destination (from courier_destinations). */
export async function getRouteModalities(destinationId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("courier_destinations")
    .select("modality_id, modalities(id, name, code)")
    .eq("destination_id", destinationId)
    .eq("is_active", true);

  if (error) return { data: null, error: error.message };

  // Deduplicate by modality_id
  const seen = new Set<string>();
  const modalities = (data ?? [])
    .filter((d) => {
      if (!d.modality_id || seen.has(d.modality_id)) return false;
      seen.add(d.modality_id);
      return true;
    })
    .map((d) => d.modalities as unknown as { id: string; name: string; code: string })
    .filter(Boolean);

  return { data: modalities, error: null };
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

export async function getShippingDocsForWarehouseReceipt(wrId: string) {
  const supabase = await createClient();

  // Get WR's hawb_id
  const { data: wr } = await supabase
    .from("warehouse_receipts")
    .select("hawb_id")
    .eq("id", wrId)
    .single();

  if (!wr?.hawb_id) {
    // No HAWB assigned — check if there's an SI via shipping_instruction_items
    const { data: siItems } = await supabase
      .from("shipping_instruction_items")
      .select("shipping_instructions(id, si_number, status)")
      .eq("warehouse_receipt_id", wrId)
      .limit(1);

    const raw = siItems?.[0]?.shipping_instructions;
    const si = (Array.isArray(raw) ? raw[0] : raw) as { id: string; si_number: string; status: string } | undefined ?? null;

    return {
      hawb: null,
      shippingInstruction: si ?? null,
      shipment: null,
    };
  }

  // Fetch HAWB with SI and shipment in one query
  const { data: hawb } = await supabase
    .from("hawbs")
    .select("id, hawb_number, document_type, shipping_instruction_id, shipment_id")
    .eq("id", wr.hawb_id)
    .single();

  if (!hawb) return { hawb: null, shippingInstruction: null, shipment: null };

  // Fetch SI and Shipment in parallel
  const [siResult, shipmentResult] = await Promise.all([
    hawb.shipping_instruction_id
      ? supabase
          .from("shipping_instructions")
          .select("id, si_number, status")
          .eq("id", hawb.shipping_instruction_id)
          .single()
      : Promise.resolve({ data: null }),
    hawb.shipment_id
      ? supabase
          .from("shipments")
          .select("id, shipment_number, modality, status")
          .eq("id", hawb.shipment_id)
          .single()
      : Promise.resolve({ data: null }),
  ]);

  return {
    hawb: { id: hawb.id, hawb_number: hawb.hawb_number, document_type: hawb.document_type },
    shippingInstruction: siResult.data as { id: string; si_number: string; status: string } | null,
    shipment: shipmentResult.data as { id: string; shipment_number: string; modality: string; status: string } | null,
  };
}

export async function getHawbForPrint(siId: string) {
  const supabase = await createClient();

  // Get user's org ID
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .limit(1)
    .single();

  const orgId = profile?.organization_id;
  if (!orgId) return { data: null };

  // Fetch SI with full relations needed for the HAWB document
  const { data: si, error } = await supabase
    .from("shipping_instructions")
    .select(`
      *,
      agencies(id, name, code, type, courier_id, ruc, address, phone, email,
        couriers(name, code, ruc, address, city, country, phone, email)
      ),
      consignees(full_name, casillero, cedula_ruc, address_line1, address_line2, city, province, postal_code, phone, email),
      destinations(id, city, country_code),
      hawbs(*),
      modalities(id, name, code),
      shipping_categories(code, name),
      warehouses(name, code, city, country, full_address, phone, email),
      shipping_instruction_items(
        warehouse_receipt_id,
        warehouse_receipts(
          wr_number,
          total_actual_weight_lb,
          total_billable_weight_lb,
          total_packages,
          total_pieces,
          content_description,
          has_dgr_package,
          packages(tracking_number, carrier, package_type, pieces_count, actual_weight_lb, billable_weight_lb, length_in, width_in, height_in, is_dgr, dgr_class)
        )
      )
    `)
    .eq("id", siId)
    .single();

  if (error || !si) return { data: null };

  // Fetch shipment data separately for any HAWB that has a shipment_id
  const hawbs = (si.hawbs ?? []) as Array<Record<string, unknown>>;
  const shipmentIds = hawbs.map((h) => h.shipment_id).filter(Boolean) as string[];
  let shipmentsMap: Record<string, { id: string; shipment_number: string; modality: string | null; status: string; carrier_name: string | null; flight_number: string | null; departure_date: string | null; departure_airport: string | null; arrival_airport: string | null; awb_number: string | null }> = {};

  if (shipmentIds.length > 0) {
    const { data: shipments } = await supabase
      .from("shipments")
      .select("id, shipment_number, modality, status, flight_number, departure_date, departure_airport, arrival_airport, awb_number, carrier_id, carriers(name)")
      .in("id", shipmentIds);

    for (const s of shipments ?? []) {
      const carrier = s.carriers as unknown as { name: string } | { name: string }[] | null;
      const carrierName = carrier ? (Array.isArray(carrier) ? carrier[0]?.name : carrier.name) : null;
      shipmentsMap[s.id] = {
        id: s.id,
        shipment_number: s.shipment_number,
        modality: s.modality,
        status: s.status,
        carrier_name: carrierName ?? null,
        flight_number: s.flight_number,
        departure_date: s.departure_date,
        departure_airport: s.departure_airport ?? null,
        arrival_airport: s.arrival_airport ?? null,
        awb_number: s.awb_number ?? null,
      };
    }
  }

  // Attach shipment data to hawbs
  for (const h of hawbs) {
    (h as any).shipments = h.shipment_id ? shipmentsMap[(h as any).shipment_id] ?? null : null;
  }

  // Fetch settings and org info in parallel
  const settingKeys = [
    "hawb_iata_code",
    "hawb_account_no",
    "hawb_airport_name",
    "hawb_shipper_account",
  ] as const;

  const [settingsResults, orgResult] = await Promise.all([
    Promise.all(
      settingKeys.map((key) =>
        supabase.rpc("resolve_setting", { p_org_id: orgId, p_key: key }).then((r) => [key, r.data] as const),
      ),
    ),
    supabase.from("organizations").select("name, logo_url, slug").eq("id", orgId).single(),
  ]);

  const settings = Object.fromEntries(
    settingsResults.map(([key, val]) => [key, val != null ? String(val).replace(/^"|"$/g, "") : ""]),
  );

  return { data: si, settings, org: orgResult.data };
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

  revalidatePath("/shipping-instructions");
  return {};
}

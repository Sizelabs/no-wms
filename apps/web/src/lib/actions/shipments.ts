"use server";

import { revalidatePath } from "next/cache";

import { getUserWarehouseScope } from "@/lib/auth/scope";
import { extractModalityCode, getDocumentType, SHIPMENT_MODALITY_TO_DOC_TYPE } from "@/lib/shipping-utils";
import { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

interface SiWithItems {
  id: string;
  organization_id: string;
  modality: string | null;
  modalities: unknown;
  shipping_instruction_items: Array<{
    warehouse_receipt_id: string;
    warehouse_receipts: { total_billable_weight_lb: number | null } | null;
  }>;
}

/** Generate a HAWB row for a single SI and backfill hawb_id on its WRs. */
async function generateHawbForSi(
  supabase: SupabaseClient,
  si: SiWithItems,
  shipmentId: string,
): Promise<void> {
  const modalityCode = extractModalityCode(si);
  const documentType = getDocumentType(modalityCode);

  const { data: hawbNumber } = await supabase.rpc("next_house_bill_number", {
    p_org_id: si.organization_id,
    p_doc_type: documentType,
  });
  if (!hawbNumber) return;

  const items = si.shipping_instruction_items ?? [];
  const totalPieces = items.length;
  const totalWeight = items.reduce(
    (sum, i) => sum + Number(i.warehouse_receipts?.total_billable_weight_lb ?? 0),
    0,
  );

  const { data: hawb } = await supabase
    .from("hawbs")
    .insert({
      organization_id: si.organization_id,
      shipping_instruction_id: si.id,
      shipment_id: shipmentId,
      hawb_number: hawbNumber,
      document_type: documentType,
      pieces: totalPieces,
      weight_lb: totalWeight,
    })
    .select("id")
    .single();

  if (hawb) {
    const wrIds = items.map((i) => i.warehouse_receipt_id).filter(Boolean);
    if (wrIds.length) {
      await supabase.from("warehouse_receipts").update({ hawb_id: hawb.id }).in("id", wrIds);
    }
  }
}

/** Recalculate and update a shipment's total_pieces, total_weight_lb, and total_house_bills from its HAWBs. */
async function recalcShipmentTotals(
  supabase: SupabaseClient,
  shipmentId: string,
): Promise<void> {
  const { data: hawbs } = await supabase
    .from("hawbs")
    .select("pieces, weight_lb")
    .eq("shipment_id", shipmentId);

  const rows = hawbs ?? [];
  const totals = rows.reduce(
    (acc, h) => {
      acc.pieces += h.pieces ?? 0;
      acc.weight += Number(h.weight_lb ?? 0);
      return acc;
    },
    { pieces: 0, weight: 0 },
  );

  await supabase
    .from("shipments")
    .update({
      total_pieces: rows.length ? totals.pieces : null,
      total_weight_lb: rows.length ? totals.weight : null,
      total_house_bills: rows.length ? rows.length : null,
    })
    .eq("id", shipmentId);
}

// ── Shipments ──

export async function createShipment(formData: FormData): Promise<{ id: string; shipment_number: string } | { error: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile) return { error: "Perfil no encontrado" };

  const modality = formData.get("modality") as string;

  // Generate shipment number via RPC
  const { data: shipmentNumber } = await supabase.rpc("next_shipment_number", {
    p_org_id: profile.organization_id,
    p_modality: modality,
  });

  if (!shipmentNumber) return { error: "No se pudo generar número de embarque" };

  // For air shipments: try auto-assigning AWB from batch
  let awbNumber = (formData.get("awb_number") as string) || null;
  const carrierId = (formData.get("carrier_id") as string) || null;

  if (modality === "air" && !awbNumber && carrierId) {
    const { data: allBatches } = await supabase
      .from("awb_batches")
      .select("id, next_available, range_end")
      .eq("carrier_id", carrierId)
      .order("created_at", { ascending: true });

    const availableBatch = allBatches?.find((b: { next_available: number; range_end: number }) => b.next_available <= b.range_end);
    if (availableBatch) {
      const { data: generatedAwb } = await supabase.rpc("next_awb_number", {
        p_batch_id: availableBatch.id,
      });
      if (generatedAwb) awbNumber = generatedAwb as string;
    }
  }

  // Build insert object
  const insertData: Record<string, unknown> = {
    organization_id: profile.organization_id,
    warehouse_id: formData.get("warehouse_id") as string,
    modality,
    shipment_number: shipmentNumber as string,
    carrier_id: carrierId,
    destination_id: (formData.get("destination_id") as string) || null,
    destination_agent_id: (formData.get("destination_agent_id") as string) || null,
    shipper_name: (formData.get("shipper_name") as string) || null,
    shipper_address: (formData.get("shipper_address") as string) || null,
    consignee_name: (formData.get("consignee_name") as string) || null,
    consignee_address: (formData.get("consignee_address") as string) || null,
    notes: (formData.get("notes") as string) || null,
  };

  // Air-specific fields
  if (modality === "air") {
    insertData.awb_number = awbNumber;
    insertData.booking_number = (formData.get("booking_number") as string) || null;
    insertData.flight_number = (formData.get("flight_number") as string) || null;
    insertData.departure_airport = (formData.get("departure_airport") as string) || null;
    insertData.arrival_airport = (formData.get("arrival_airport") as string) || null;
    insertData.departure_date = (formData.get("departure_date") as string) || null;
    insertData.arrival_date = (formData.get("arrival_date") as string) || null;
  }

  // Ocean-specific fields
  if (modality === "ocean") {
    insertData.bol_number = (formData.get("bol_number") as string) || null;
    insertData.port_of_loading = (formData.get("port_of_loading") as string) || null;
    insertData.terminal_or_pier = (formData.get("terminal_or_pier") as string) || null;
    insertData.pre_carrier = (formData.get("pre_carrier") as string) || null;
    insertData.exporting_carrier = (formData.get("exporting_carrier") as string) || null;
    insertData.vessel_name = (formData.get("vessel_name") as string) || null;
    insertData.vessel_flag = (formData.get("vessel_flag") as string) || null;
    insertData.voyage_id = (formData.get("voyage_id") as string) || null;
    insertData.port_of_unloading = (formData.get("port_of_unloading") as string) || null;
    insertData.place_of_delivery_by_on_carrier = (formData.get("place_of_delivery_by_on_carrier") as string) || null;
    insertData.freight_terms = (formData.get("freight_terms") as string) || null;
    const nBols = formData.get("number_of_original_bols");
    insertData.number_of_original_bols = nBols ? parseInt(nBols as string, 10) : null;
  }

  // Ground-specific fields
  if (modality === "ground") {
    insertData.route_number = (formData.get("route_number") as string) || null;
    insertData.origin_terminal = (formData.get("origin_terminal") as string) || null;
    insertData.destination_terminal = (formData.get("destination_terminal") as string) || null;
    insertData.truck_plate = (formData.get("truck_plate") as string) || null;
    insertData.driver_name = (formData.get("driver_name") as string) || null;
    insertData.driver_id_number = (formData.get("driver_id_number") as string) || null;
    insertData.driver_phone = (formData.get("driver_phone") as string) || null;
    insertData.trailer_number = (formData.get("trailer_number") as string) || null;
    const transitHours = formData.get("estimated_transit_hours");
    insertData.estimated_transit_hours = transitHours ? parseInt(transitHours as string, 10) : null;
    insertData.border_crossing_point = (formData.get("border_crossing_point") as string) || null;
  }

  const { data, error } = await supabase
    .from("shipments")
    .insert(insertData)
    .select("id, shipment_number")
    .single();

  if (error) return { error: error.message };

  // Create initial status history entry
  await supabase.from("shipment_status_history").insert({
    organization_id: profile.organization_id,
    shipment_id: data.id,
    old_status: null,
    new_status: "draft",
    changed_by: user.id,
  });

  revalidatePath("/shipments");
  return { id: data.id, shipment_number: data.shipment_number };
}

export async function getShipments(filters?: { status?: string; modality?: string }) {
  const supabase = await createClient();
  const warehouseScope = await getUserWarehouseScope();

  if (warehouseScope !== null && warehouseScope.length === 0) {
    return { data: [], error: null };
  }

  let query = supabase
    .from("shipments")
    .select("*, carriers(name, code), destinations:destination_id(city, country_code), hawbs(id, hawb_number, document_type, shipping_instruction_id)")
    .order("created_at", { ascending: false });

  if (warehouseScope !== null) {
    query = query.in("warehouse_id", warehouseScope);
  }

  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.modality) query = query.eq("modality", filters.modality);

  const { data, error } = await query;
  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function getShipment(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("shipments")
    .select("*, carriers(name, code), destinations:destination_id(city, country_code), agencies:destination_agent_id(name, code), hawbs(*, shipping_instructions(si_number, agency_id, agencies(name, code))), shipment_containers(*)")
    .eq("id", id)
    .single();

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function updateShipmentStatus(id: string, newStatus: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: shipment } = await supabase
    .from("shipments")
    .select("status, organization_id")
    .eq("id", id)
    .single();

  if (!shipment) return { error: "Embarque no encontrado" };

  await supabase.from("shipments").update({ status: newStatus }).eq("id", id);

  // If delivered, mark all related WRs as dispatched
  if (newStatus === "delivered") {
    const { data: hawbs } = await supabase
      .from("hawbs")
      .select("id")
      .eq("shipment_id", id);

    if (hawbs?.length) {
      const hawbIds = hawbs.map((h: { id: string }) => h.id);
      const { data: wrs } = await supabase
        .from("warehouse_receipts")
        .select("id")
        .in("hawb_id", hawbIds);

      if (wrs?.length) {
        const wrIds = wrs.map((w: { id: string }) => w.id);
        await supabase
          .from("warehouse_receipts")
          .update({ status: "dispatched" })
          .in("id", wrIds);
      }
    }
  }

  await supabase.from("shipment_status_history").insert({
    organization_id: shipment.organization_id,
    shipment_id: id,
    old_status: shipment.status,
    new_status: newStatus,
    changed_by: user.id,
  });

  revalidatePath("/shipments");
  revalidatePath("/inventory");
  return {};
}

/** Generate a HAWB from a finalized SI and assign it to a shipment. */
export async function assignSiToShipment(
  siId: string,
  shipmentId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();

  // Fetch SI (with existing HAWBs check) and shipment in parallel
  const [{ data: si }, { data: shipment }] = await Promise.all([
    supabase
      .from("shipping_instructions")
      .select("id, status, organization_id, modality, modalities(code), hawbs(id), shipping_instruction_items(warehouse_receipt_id, warehouse_receipts(total_billable_weight_lb))")
      .eq("id", siId)
      .single(),
    supabase.from("shipments").select("id, modality, organization_id").eq("id", shipmentId).single(),
  ]);

  if (!si) return { error: "SI no encontrada" };
  if (!shipment) return { error: "Embarque no encontrado" };
  if (si.status !== "finalized") return { error: "Solo se pueden asignar SIs finalizadas" };

  // Check SI doesn't already have a HAWB
  if ((si.hawbs as unknown[] | null)?.length) return { error: "Esta SI ya tiene una guía generada" };

  // Validate modality match
  const modalityCode = extractModalityCode(si);
  const documentType = getDocumentType(modalityCode);
  const expectedDocType = SHIPMENT_MODALITY_TO_DOC_TYPE[shipment.modality];
  if (documentType !== expectedDocType) {
    return { error: `Modalidad de SI (${modalityCode}) no coincide con modalidad del embarque (${shipment.modality})` };
  }

  await generateHawbForSi(supabase, si as unknown as SiWithItems, shipmentId);
  await recalcShipmentTotals(supabase, shipmentId);

  revalidatePath("/shipments");
  revalidatePath("/shipping-instructions");
  return {};
}

/** Fetch finalized SIs that don't have a HAWB yet (available for shipment assignment). */
export async function getUnassignedFinalizedSIs(shipmentModality?: string) {
  const supabase = await createClient();

  // Single query: get finalized SIs with hawbs(id) to filter in-memory
  const { data: sis, error } = await supabase
    .from("shipping_instructions")
    .select("id, si_number, modality, modalities(id, name, code), agency_id, agencies(name, code), destination_id, total_pieces, total_billable_weight_lb, created_at, hawbs(id), shipping_instruction_items(warehouse_receipt_id, warehouse_receipts(wr_number, packages(tracking_number)))")
    .eq("status", "finalized")
    .order("created_at", { ascending: false });

  if (error) return { data: null, error: error.message };

  // Filter out SIs that already have a HAWB
  let result = (sis ?? []).filter((si) => !(si.hawbs as unknown[] | null)?.length);

  // Filter by shipment modality if provided
  if (shipmentModality) {
    const expectedDocType = SHIPMENT_MODALITY_TO_DOC_TYPE[shipmentModality];
    if (!expectedDocType) return { data: null, error: "Modalidad inválida" };

    result = result.filter((si) => {
      const code = extractModalityCode(si);
      return getDocumentType(code) === expectedDocType;
    });
  }

  return { data: result, error: null };
}

/** Create a shipment and generate HAWBs for each finalized SI. */
export async function createShipmentWithSIs(
  formData: FormData,
  siIds: string[],
): Promise<{ id: string; shipment_number: string } | { error: string }> {
  const shipmentResult = await createShipment(formData);
  if ("error" in shipmentResult) return shipmentResult;

  const supabase = await createClient();
  const shipmentId = shipmentResult.id;

  // Fetch all SIs with their modality + items
  const { data: sis } = await supabase
    .from("shipping_instructions")
    .select("id, organization_id, modality, modalities(code), shipping_instruction_items(warehouse_receipt_id, warehouse_receipts(total_billable_weight_lb))")
    .in("id", siIds);

  if (!sis?.length) return { id: shipmentId, shipment_number: shipmentResult.shipment_number };

  // Generate HAWBs for each SI (sequential — number generation requires advisory lock)
  for (const si of sis) {
    await generateHawbForSi(supabase, si as unknown as SiWithItems, shipmentId);
  }

  await recalcShipmentTotals(supabase, shipmentId);

  revalidatePath("/shipments");
  revalidatePath("/shipping-instructions");
  return { id: shipmentId, shipment_number: shipmentResult.shipment_number };
}

// ── Containers (ocean shipments) ──

export async function addContainer(formData: FormData): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile) return { error: "Perfil no encontrado" };

  const { data, error } = await supabase
    .from("shipment_containers")
    .insert({
      organization_id: profile.organization_id,
      shipment_id: formData.get("shipment_id") as string,
      container_number: formData.get("container_number") as string,
      seal_number: (formData.get("seal_number") as string) || null,
      container_type: formData.get("container_type") as string,
      tare_weight: formData.get("tare_weight") ? parseFloat(formData.get("tare_weight") as string) : null,
      max_payload: formData.get("max_payload") ? parseFloat(formData.get("max_payload") as string) : null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/shipments");
  return { id: data.id };
}

export async function removeContainer(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("shipment_containers")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/shipments");
  return {};
}

// ── MAWB Print ──

export async function getMawbForPrint(shipmentId: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, settings: null, org: null };

  // Fetch profile and shipment in parallel (shipment query doesn't need orgId)
  const [{ data: profile }, { data: shipment, error }] = await Promise.all([
    supabase.from("profiles").select("organization_id").eq("id", user.id).single(),
    supabase
      .from("shipments")
      .select(`
        *,
        carriers(name, code),
        destinations:destination_id(city, country_code),
        agencies:destination_agent_id(name, code, address, phone, email),
        warehouses:warehouse_id(name, code, city, country, full_address, phone, email),
        hawbs(
          id, hawb_number, document_type, pieces, weight_lb, created_at,
          shipping_instructions(
            si_number, agency_id, total_pieces, total_billable_weight_lb, total_declared_value_usd,
            special_instructions, additional_charges,
            agencies(name, code, ruc, address, phone, email),
            consignees(full_name, casillero, cedula_ruc, address_line1, city, province, phone),
            shipping_instruction_items(
              warehouse_receipt_id,
              warehouse_receipts(
                wr_number, total_actual_weight_lb, total_billable_weight_lb, total_packages, total_pieces,
                has_dgr_package,
                packages(tracking_number, package_type, pieces_count, actual_weight_lb, billable_weight_lb,
                  length_in, width_in, height_in, is_dgr, dgr_class, content_description)
              )
            )
          )
        )
      `)
      .eq("id", shipmentId)
      .single(),
  ]);

  const orgId = profile?.organization_id;
  if (!orgId || error || !shipment) return { data: null, settings: null, org: null };

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

  return { data: shipment, settings, org: orgResult.data };
}

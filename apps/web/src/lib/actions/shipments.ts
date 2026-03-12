"use server";

import { revalidatePath } from "next/cache";

import { getUserWarehouseScope } from "@/lib/auth/scope";
import { createClient } from "@/lib/supabase/server";

// ── Shipments ──

export async function createShipment(formData: FormData): Promise<{ id: string } | { error: string }> {
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
    // Find an available AWB batch for this carrier
    const { data: batches } = await supabase
      .from("awb_batches")
      .select("id")
      .eq("carrier_id", carrierId)
      .filter("next_available", "lte", supabase.rpc as unknown as string) // We'll check in the function
      .order("created_at", { ascending: true })
      .limit(1);

    // Try the first batch that might have availability
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
    // If no batch available, allow manual entry (awbNumber stays null or whatever was provided)
    void batches; // suppress unused
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
    .select("id")
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
  return { id: data.id };
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

export async function assignHouseBillToShipment(
  houseBillId: string,
  shipmentId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();

  // Get house bill document_type and shipment modality for validation
  const [{ data: houseBill }, { data: shipment }] = await Promise.all([
    supabase.from("hawbs").select("document_type").eq("id", houseBillId).single(),
    supabase.from("shipments").select("modality").eq("id", shipmentId).single(),
  ]);

  if (!houseBill) return { error: "House bill no encontrado" };
  if (!shipment) return { error: "Embarque no encontrado" };

  // Validate document_type matches shipment modality
  const modalityDocMap: Record<string, string> = {
    air: "hawb",
    ocean: "hbl",
    ground: "hwb",
  };
  if (houseBill.document_type !== modalityDocMap[shipment.modality]) {
    return { error: `Tipo de documento ${houseBill.document_type} no coincide con modalidad ${shipment.modality}` };
  }

  const { error } = await supabase
    .from("hawbs")
    .update({ shipment_id: shipmentId })
    .eq("id", houseBillId);

  if (error) return { error: error.message };

  revalidatePath("/shipments");
  return {};
}

export async function getUnassignedHouseBills(modality?: string) {
  const supabase = await createClient();

  let query = supabase
    .from("hawbs")
    .select("*, shipping_instructions(si_number, agency_id, agencies(name, code), shipping_instruction_items(warehouse_receipt_id, warehouse_receipts(wr_number, packages(tracking_number))))")
    .is("shipment_id", null)
    .order("created_at", { ascending: false });

  if (modality) {
    const modalityDocMap: Record<string, string> = {
      air: "hawb",
      ocean: "hbl",
      ground: "hwb",
    };
    const docType = modalityDocMap[modality];
    if (!docType) return { data: null, error: "Modalidad inválida" };
    query = query.eq("document_type", docType);
  }

  const { data, error } = await query;
  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function createShipmentWithHouseBills(
  formData: FormData,
  houseBillIds: string[],
): Promise<{ id: string } | { error: string }> {
  const result = await createShipment(formData);
  if ("error" in result) return result;

  const supabase = await createClient();

  const { error } = await supabase
    .from("hawbs")
    .update({ shipment_id: result.id })
    .in("id", houseBillIds);

  if (error) return { error: error.message };

  revalidatePath("/shipments");
  return { id: result.id };
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

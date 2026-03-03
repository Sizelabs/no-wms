"use server";

import { revalidatePath } from "next/cache";

import { getUserAgencyScope, getUserWarehouseScope } from "@/lib/auth/scope";
import { createClient } from "@/lib/supabase/server";

export async function createWorkOrder(formData: FormData): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autenticado" };

  const type = formData.get("type") as string;
  const warehouseId = formData.get("warehouse_id") as string;
  const agencyId = formData.get("agency_id") as string;
  const instructions = formData.get("instructions") as string | null;
  const wrIds = JSON.parse(formData.get("warehouse_receipt_ids") as string) as string[];
  const metadataRaw = formData.get("metadata") as string | null;
  const metadata = metadataRaw ? JSON.parse(metadataRaw) as Record<string, unknown> : null;

  if (!wrIds.length) return { error: "Seleccione al menos un WR" };

  // Check WRs don't have active WOs
  const { data: existingWoItems } = await supabase
    .from("work_order_items")
    .select("warehouse_receipt_id, work_orders!inner(status)")
    .in("warehouse_receipt_id", wrIds)
    .in("work_orders.status", ["requested", "approved", "in_progress"]);

  if (existingWoItems?.length) {
    return { error: "Uno o más WRs tienen órdenes de trabajo activas" };
  }

  // Auto-priority from agency type
  const { data: agency } = await supabase
    .from("agencies")
    .select("type")
    .eq("id", agencyId)
    .single();

  const priority = agency?.type === "corporativo" ? "high" : "normal";

  // Generate WO number
  const { count } = await supabase
    .from("work_orders")
    .select("*", { count: "exact", head: true });

  const woNumber = `WO${String((count ?? 0) + 1).padStart(5, "0")}`;

  // Get org_id from profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile) return { error: "Perfil no encontrado" };

  const insertData: Record<string, unknown> = {
    organization_id: profile.organization_id,
    warehouse_id: warehouseId,
    wo_number: woNumber,
    type,
    priority,
    requested_by: user.id,
    agency_id: agencyId,
    instructions: instructions || null,
    metadata: metadata || null,
  };

  // Pickup fields
  if (type === "authorize_pickup") {
    insertData.pickup_date = formData.get("pickup_date");
    insertData.pickup_time = formData.get("pickup_time") || null;
    insertData.pickup_location = formData.get("pickup_location");
    insertData.pickup_authorized_person = formData.get("pickup_authorized_person");
    insertData.pickup_contact_info = formData.get("pickup_contact_info") || null;
  }

  // Types requiring admin approval start as "pending"
  if (type === "abandon") {
    insertData.status = "pending";
  }

  const { data: wo, error } = await supabase
    .from("work_orders")
    .insert(insertData)
    .select("id")
    .single();

  if (error) return { error: error.message };

  // Insert WO items
  const items = wrIds.map((wrId) => ({
    work_order_id: wo.id,
    warehouse_receipt_id: wrId,
  }));

  await supabase.from("work_order_items").insert(items);

  // Update WR statuses to in_work_order
  await supabase
    .from("warehouse_receipts")
    .update({ status: "in_work_order" })
    .in("id", wrIds);

  // Record status history
  await supabase.from("work_order_status_history").insert({
    organization_id: profile.organization_id,
    work_order_id: wo.id,
    old_status: null,
    new_status: insertData.status ?? "requested",
    changed_by: user.id,
  });

  revalidatePath("/work-orders");
  revalidatePath("/warehouse-receipts");
  revalidatePath("/inventory");

  return { id: wo.id };
}

export async function getWorkOrders(filters?: {
  status?: string;
  type?: string;
  agency_id?: string;
  priority?: string;
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
    .from("work_orders")
    .select("*, agencies(name, code, type), profiles!work_orders_requested_by_fkey(full_name), work_order_items(warehouse_receipt_id)")
    .order("created_at", { ascending: false });

  if (warehouseScope !== null) {
    query = query.in("warehouse_id", warehouseScope);
  }
  if (agencyScope !== null) {
    query = query.in("agency_id", agencyScope);
  }

  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.type) query = query.eq("type", filters.type);
  if (filters?.agency_id) query = query.eq("agency_id", filters.agency_id);
  if (filters?.priority) query = query.eq("priority", filters.priority);

  const { data, error } = await query;

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function getWorkOrder(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("work_orders")
    .select("*, agencies(name, code, type), profiles!work_orders_requested_by_fkey(full_name), work_order_items(*, warehouse_receipts(wr_number, status, packages(tracking_number, carrier)))")
    .eq("id", id)
    .single();

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function updateWorkOrderStatus(
  id: string,
  newStatus: string,
  formData?: FormData,
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autenticado" };

  const { data: wo } = await supabase
    .from("work_orders")
    .select("status, organization_id, work_order_items(warehouse_receipt_id)")
    .eq("id", id)
    .single();

  if (!wo) return { error: "OT no encontrada" };

  // Completion validation
  if (newStatus === "completed") {
    const resultNotes = formData?.get("result_notes") as string;
    if (!resultNotes?.trim()) {
      return { error: "Notas de resultado requeridas para completar" };
    }

    await supabase
      .from("work_orders")
      .update({
        status: "completed",
        result_notes: resultNotes,
        completed_at: new Date().toISOString(),
      })
      .eq("id", id);

    // Return WRs to in_warehouse
    const wrIds = wo.work_order_items?.map((i: { warehouse_receipt_id: string }) => i.warehouse_receipt_id) ?? [];
    if (wrIds.length) {
      await supabase
        .from("warehouse_receipts")
        .update({ status: "in_warehouse" })
        .in("id", wrIds);
    }
  } else if (newStatus === "cancelled") {
    const reason = formData?.get("cancellation_reason") as string;
    await supabase
      .from("work_orders")
      .update({ status: "cancelled", cancellation_reason: reason || null })
      .eq("id", id);

    // Return WRs to in_warehouse
    const wrIds = wo.work_order_items?.map((i: { warehouse_receipt_id: string }) => i.warehouse_receipt_id) ?? [];
    if (wrIds.length) {
      await supabase
        .from("warehouse_receipts")
        .update({ status: "in_warehouse" })
        .in("id", wrIds);
    }
  } else {
    await supabase
      .from("work_orders")
      .update({
        status: newStatus,
        assigned_to: newStatus === "in_progress" ? user.id : undefined,
      })
      .eq("id", id);
  }

  // Record history
  await supabase.from("work_order_status_history").insert({
    organization_id: wo.organization_id,
    work_order_id: id,
    old_status: wo.status,
    new_status: newStatus,
    changed_by: user.id,
  });

  revalidatePath("/work-orders");
  revalidatePath("/inventory");

  return {};
}

"use server";

import {
  calculateBillableWeight,
  calculateVolumetricWeight,
  createWarehouseReceiptSchema,
} from "@no-wms/shared/validators/warehouse-receipt";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function checkDuplicateTracking(trackingNumber: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("warehouse_receipts")
    .select("id, wr_number, received_at")
    .eq("tracking_number", trackingNumber)
    .maybeSingle();

  return data;
}

export async function generateWrNumber(): Promise<string> {
  const supabase = await createClient();

  // Get current max WR number for this org
  const { data } = await supabase
    .from("warehouse_receipts")
    .select("wr_number")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data?.wr_number) {
    return "GLP0001";
  }

  // Extract numeric part and increment
  const match = data.wr_number.match(/(\d+)$/);
  const nextNum = match ? parseInt(match[1]!, 10) + 1 : 1;
  return `GLP${String(nextNum).padStart(4, "0")}`;
}

export async function createWarehouseReceipt(formData: FormData): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/es/login");
  }

  // Parse and validate
  const raw = {
    warehouse_id: formData.get("warehouse_id") as string,
    agency_id: formData.get("agency_id") as string,
    tracking_number: (formData.get("tracking_number") as string)?.trim(),
    carrier: formData.get("carrier") as string,
    consignee_id: (formData.get("consignee_id") as string) || null,
    actual_weight_lb: formData.get("actual_weight_lb") ? Number(formData.get("actual_weight_lb")) : undefined,
    length_in: formData.get("length_in") ? Number(formData.get("length_in")) : undefined,
    width_in: formData.get("width_in") ? Number(formData.get("width_in")) : undefined,
    height_in: formData.get("height_in") ? Number(formData.get("height_in")) : undefined,
    content_description: (formData.get("content_description") as string) || undefined,
    is_dgr: formData.get("is_dgr") === "true",
    dgr_class: (formData.get("dgr_class") as string) || undefined,
    is_damaged: formData.get("is_damaged") === "true",
    damage_description: (formData.get("damage_description") as string) || undefined,
    warehouse_location_id: (formData.get("warehouse_location_id") as string) || undefined,
    sender_name: (formData.get("sender_name") as string) || undefined,
    pieces_count: formData.get("pieces_count") ? Number(formData.get("pieces_count")) : 1,
    notes: (formData.get("notes") as string) || undefined,
    client_id: (formData.get("client_id") as string) || undefined,
  };

  const parsed = createWarehouseReceiptSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(parsed.error.errors.map((e) => e.message).join(", "));
  }

  const input = parsed.data;

  // Duplicate check
  const duplicate = await checkDuplicateTracking(input.tracking_number);
  if (duplicate) {
    throw new Error(
      `Esta guía ya fue recibida el ${new Date(duplicate.received_at).toLocaleDateString("es")}. WR: ${duplicate.wr_number}`,
    );
  }

  // Calculate weights
  const dimensionalFactor = 166; // TODO: resolve from settings
  let volumetricWeightLb: number | null = null;
  if (input.length_in && input.width_in && input.height_in) {
    volumetricWeightLb = calculateVolumetricWeight(
      input.length_in,
      input.width_in,
      input.height_in,
      dimensionalFactor,
    );
  }
  const billableWeightLb = calculateBillableWeight(
    input.actual_weight_lb ?? null,
    volumetricWeightLb,
  );

  // Generate WR number
  const wrNumber = await generateWrNumber();

  // Get org ID from user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    throw new Error("Perfil no encontrado");
  }

  // Insert WR
  const { data: wr, error } = await supabase
    .from("warehouse_receipts")
    .insert({
      organization_id: profile.organization_id,
      warehouse_id: input.warehouse_id,
      wr_number: wrNumber,
      tracking_number: input.tracking_number,
      carrier: input.carrier,
      status: "received",
      agency_id: input.agency_id,
      consignee_id: input.consignee_id ?? null,
      actual_weight_lb: input.actual_weight_lb ?? null,
      length_in: input.length_in ?? null,
      width_in: input.width_in ?? null,
      height_in: input.height_in ?? null,
      volumetric_weight_lb: volumetricWeightLb,
      billable_weight_lb: billableWeightLb,
      content_description: input.content_description ?? null,
      is_dgr: input.is_dgr,
      dgr_class: input.dgr_class ?? null,
      dgr_checklist_completed: input.dgr_checklist_completed ?? null,
      is_damaged: input.is_damaged,
      damage_description: input.damage_description ?? null,
      warehouse_location_id: input.warehouse_location_id ?? null,
      sender_name: input.sender_name ?? null,
      pieces_count: input.pieces_count,
      notes: input.notes ?? null,
      received_by: user.id,
      client_id: input.client_id ?? null,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  // Insert initial status history
  await supabase.from("wr_status_history").insert({
    organization_id: profile.organization_id,
    warehouse_receipt_id: wr.id,
    new_status: "received",
    changed_by: user.id,
  });

  revalidatePath("/warehouse-receipts");
  revalidatePath("/inventory");
}

export async function getWarehouseReceipts(filters?: {
  status?: string;
  agency_id?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const supabase = await createClient();

  let query = supabase
    .from("warehouse_receipts")
    .select("*, agencies(name, code, type), consignees(full_name)", { count: "exact" })
    .order("received_at", { ascending: false });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  if (filters?.agency_id) {
    query = query.eq("agency_id", filters.agency_id);
  }

  if (filters?.search) {
    query = query.or(
      `tracking_number.ilike.%${filters.search}%,wr_number.ilike.%${filters.search}%,sender_name.ilike.%${filters.search}%,notes.ilike.%${filters.search}%`,
    );
  }

  const limit = filters?.limit ?? 50;
  const offset = filters?.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    return { data: null, error: error.message, count: 0 };
  }

  return { data, error: null, count: count ?? 0 };
}

export async function getWarehouseReceipt(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("warehouse_receipts")
    .select(
      "*, agencies(name, code, type), consignees(full_name), wr_photos(*), wr_status_history(*, profiles:changed_by(full_name)), wr_notes(*, profiles:created_by(full_name))",
    )
    .eq("id", id)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function updateWarehouseReceiptStatus(
  id: string,
  newStatus: string,
  reason?: string,
): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("No autenticado");
  }

  // Get current status
  const { data: current } = await supabase
    .from("warehouse_receipts")
    .select("status, organization_id")
    .eq("id", id)
    .single();

  if (!current) {
    throw new Error("WR no encontrado");
  }

  // Update status
  const { error } = await supabase
    .from("warehouse_receipts")
    .update({ status: newStatus })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  // Log status change
  await supabase.from("wr_status_history").insert({
    organization_id: current.organization_id,
    warehouse_receipt_id: id,
    old_status: current.status,
    new_status: newStatus,
    changed_by: user.id,
    reason: reason ?? null,
  });

  revalidatePath("/warehouse-receipts");
  revalidatePath("/inventory");
}

export async function bulkUpdateStatus(
  ids: string[],
  newStatus: string,
): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("No autenticado");
  }

  const { error } = await supabase
    .from("warehouse_receipts")
    .update({ status: newStatus })
    .in("id", ids);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/warehouse-receipts");
  revalidatePath("/inventory");
}

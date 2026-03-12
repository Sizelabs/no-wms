"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

// ── Pickup Requests ──

export async function createPickupRequest(formData: FormData): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile) return { error: "Perfil no encontrado" };

  const wrIds = JSON.parse(formData.get("warehouse_receipt_ids") as string) as string[];

  const { data: pickup, error } = await supabase
    .from("pickup_requests")
    .insert({
      organization_id: profile.organization_id,
      agency_id: formData.get("agency_id") as string,
      pickup_date: formData.get("pickup_date") as string,
      pickup_time: (formData.get("pickup_time") as string) || null,
      pickup_location: formData.get("pickup_location") as string,
      authorized_person_name: formData.get("authorized_person_name") as string,
      authorized_person_id: (formData.get("authorized_person_id") as string) || null,
      contact_phone: (formData.get("contact_phone") as string) || null,
      contact_email: (formData.get("contact_email") as string) || null,
      notes: (formData.get("notes") as string) || null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  if (wrIds.length) {
    const items = wrIds.map((wrId) => ({
      pickup_request_id: pickup.id,
      warehouse_receipt_id: wrId,
    }));
    await supabase.from("pickup_request_wrs").insert(items);
  }

  revalidatePath("/shipping-instructions");
  return { id: pickup.id };
}

export async function getPickupRequests(filters?: { status?: string }) {
  const supabase = await createClient();

  let query = supabase
    .from("pickup_requests")
    .select("*, agencies(name, code), pickup_request_wrs(warehouse_receipt_id)")
    .order("created_at", { ascending: false });

  if (filters?.status) query = query.eq("status", filters.status);

  const { data, error } = await query;
  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function updatePickupStatus(id: string, newStatus: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("pickup_requests")
    .update({ status: newStatus })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/shipping-instructions");
  return {};
}

// ── WR Transfer Requests ──

export async function createTransferRequest(formData: FormData): Promise<{ id: string } | { error: string }> {
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
    .from("wr_transfer_requests")
    .insert({
      organization_id: profile.organization_id,
      warehouse_receipt_id: formData.get("warehouse_receipt_id") as string,
      from_agency_id: formData.get("from_agency_id") as string,
      to_agency_id: formData.get("to_agency_id") as string,
      requested_by: user.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/inventory");
  return { id: data.id };
}

export async function approveTransferRequest(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: transfer } = await supabase
    .from("wr_transfer_requests")
    .select("warehouse_receipt_id, to_agency_id")
    .eq("id", id)
    .single();

  if (!transfer) return { error: "Solicitud no encontrada" };

  await supabase
    .from("wr_transfer_requests")
    .update({
      status: "approved",
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    })
    .eq("id", id);

  // Re-assign WR to new agency
  await supabase
    .from("warehouse_receipts")
    .update({ agency_id: transfer.to_agency_id })
    .eq("id", transfer.warehouse_receipt_id);

  revalidatePath("/inventory");
  return {};
}

export async function getTransferRequests() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("wr_transfer_requests")
    .select("*, warehouse_receipts(wr_number, packages(tracking_number)), from_agency:agencies!wr_transfer_requests_from_agency_id_fkey(name, code), to_agency:agencies!wr_transfer_requests_to_agency_id_fkey(name, code)")
    .order("created_at", { ascending: false });

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function rejectTransferRequest(id: string, reason: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  await supabase
    .from("wr_transfer_requests")
    .update({ status: "rejected", rejection_reason: reason, approved_by: user.id })
    .eq("id", id);

  revalidatePath("/inventory");
  return {};
}

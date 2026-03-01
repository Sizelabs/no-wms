"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export async function getUnknownWrs(filters?: { status?: string }) {
  const supabase = await createClient();

  let query = supabase
    .from("unknown_wrs")
    .select("*, warehouse_receipts(wr_number, carrier, received_at)")
    .order("created_at", { ascending: false });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function claimUnknownWr(
  unknownWrId: string,
  trackingNumber: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "No autenticado" };
  }

  // Get the unknown WR's linked warehouse receipt
  const { data: unknownWr } = await supabase
    .from("unknown_wrs")
    .select("warehouse_receipt_id, organization_id")
    .eq("id", unknownWrId)
    .eq("status", "unclaimed")
    .single();

  if (!unknownWr) {
    return { success: false, error: "WR desconocido no encontrado o ya reclamado" };
  }

  // Check if the tracking number matches the WR
  const { data: wr } = await supabase
    .from("warehouse_receipts")
    .select("id, tracking_number")
    .eq("id", unknownWr.warehouse_receipt_id)
    .single();

  if (!wr) {
    return { success: false, error: "WR no encontrado" };
  }

  if (wr.tracking_number.toLowerCase() !== trackingNumber.toLowerCase()) {
    return { success: false, error: "El número de guía no coincide" };
  }

  // Get agency ID from user roles
  const { data: userRole } = await supabase
    .from("user_roles")
    .select("agency_id")
    .eq("profile_id", user.id)
    .not("agency_id", "is", null)
    .limit(1)
    .maybeSingle();

  if (!userRole?.agency_id) {
    return { success: false, error: "No tiene agencia asignada" };
  }

  // Update unknown WR status
  const { error: updateError } = await supabase
    .from("unknown_wrs")
    .update({
      status: "claimed",
      claimed_by_agency_id: userRole.agency_id,
      claimed_at: new Date().toISOString(),
      claim_tracking_match: trackingNumber,
    })
    .eq("id", unknownWrId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  // Assign the WR to the agency
  await supabase
    .from("warehouse_receipts")
    .update({
      agency_id: userRole.agency_id,
      is_unknown: false,
    })
    .eq("id", unknownWr.warehouse_receipt_id);

  revalidatePath("/unknown-wrs");
  revalidatePath("/inventory");

  return { success: true };
}

export async function uploadClaimInvoice(
  unknownWrId: string,
  storagePath: string,
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("unknown_wrs")
    .update({
      claim_invoice_path: storagePath,
      status: "claimed",
      claimed_at: new Date().toISOString(),
    })
    .eq("id", unknownWrId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/unknown-wrs");
}

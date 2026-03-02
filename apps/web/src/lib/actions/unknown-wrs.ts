"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export async function getUnknownWrs(filters?: { status?: string }) {
  const supabase = await createClient();

  // Query warehouse_receipts directly where agency is not assigned,
  // left-joining unknown_wrs for claim tracking info.
  const query = supabase
    .from("warehouse_receipts")
    .select(
      "id, wr_number, tracking_number, carrier, sender_name, received_at, unknown_wrs(id, status, claimed_by_agency_id, claimed_at)",
    )
    .is("agency_id", null)
    .order("received_at", { ascending: false });

  const { data, error } = await query;

  if (error) {
    return { data: null, error: error.message };
  }

  // Apply claim status filter in application layer since unknown_wrs record may not exist
  if (filters?.status && data) {
    const filtered = data.filter((wr) => {
      const claimRecord = Array.isArray(wr.unknown_wrs) ? wr.unknown_wrs[0] : wr.unknown_wrs;
      const effectiveStatus = claimRecord?.status ?? "unclaimed";
      return effectiveStatus === filters.status;
    });
    return { data: filtered, error: null };
  }

  return { data, error: null };
}

export async function claimUnknownWr(
  warehouseReceiptId: string,
  trackingNumber: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "No autenticado" };
  }

  // Verify the WR exists, has no agency, and the tracking number matches
  const { data: wr } = await supabase
    .from("warehouse_receipts")
    .select("id, tracking_number, organization_id")
    .eq("id", warehouseReceiptId)
    .is("agency_id", null)
    .single();

  if (!wr) {
    return { success: false, error: "WR desconocido no encontrado o ya reclamado" };
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

  // Update or create the unknown_wrs claim record
  const { data: existingClaim } = await supabase
    .from("unknown_wrs")
    .select("id")
    .eq("warehouse_receipt_id", warehouseReceiptId)
    .maybeSingle();

  if (existingClaim) {
    await supabase
      .from("unknown_wrs")
      .update({
        status: "claimed",
        claimed_by_agency_id: userRole.agency_id,
        claimed_at: new Date().toISOString(),
        claim_tracking_match: trackingNumber,
      })
      .eq("id", existingClaim.id);
  } else {
    await supabase.from("unknown_wrs").insert({
      organization_id: wr.organization_id,
      warehouse_receipt_id: warehouseReceiptId,
      status: "claimed",
      claimed_by_agency_id: userRole.agency_id,
      claimed_at: new Date().toISOString(),
      claim_tracking_match: trackingNumber,
    });
  }

  // Assign the WR to the agency
  const { error: updateError } = await supabase
    .from("warehouse_receipts")
    .update({
      agency_id: userRole.agency_id,
      is_unknown: false,
    })
    .eq("id", warehouseReceiptId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

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

"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export async function getUnknownWrs(filters?: {
  status?: string;
  maskTracking?: boolean;
}) {
  const supabase = await createClient();

  // Query warehouse_receipts directly where agency is not assigned,
  // left-joining unknown_wrs for claim tracking info.
  const query = supabase
    .from("warehouse_receipts")
    .select(
      "id, wr_number, received_at, consignees(full_name), packages(tracking_number, carrier, sender_name), unknown_wrs(id, status, claimed_by_agency_id, claimed_at)",
    )
    .is("agency_id", null)
    .order("received_at", { ascending: false });

  const { data, error } = await query;

  if (error) {
    return { data: null, error: error.message };
  }

  let result = data;

  // Apply claim status filter in application layer since unknown_wrs record may not exist
  if (filters?.status && result) {
    result = result.filter((wr) => {
      const claimRecord = Array.isArray(wr.unknown_wrs)
        ? wr.unknown_wrs[0]
        : wr.unknown_wrs;
      const effectiveStatus = claimRecord?.status ?? "unclaimed";
      return effectiveStatus === filters.status;
    });
  }

  // Strip tracking numbers server-side so they never reach the client.
  // Agency users must prove they know the number to claim the WR.
  if (filters?.maskTracking && result) {
    result = result.map((wr) => {
      const pkgs = Array.isArray(wr.packages) ? wr.packages : [];
      const firstTracking = pkgs[0]?.tracking_number ?? "";
      return {
        ...wr,
        tracking_number_masked: `${"•".repeat(Math.max(0, firstTracking.length - 3))}${firstTracking.slice(-3)}`,
        packages: pkgs.map((p: Record<string, unknown>) => ({
          tracking_number: null as string | null,
          carrier: (p.carrier as string) ?? "",
          sender_name: (p.sender_name as string) ?? "",
        })),
      };
    });
  }

  return { data: result, error: null };
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

  // Verify the WR exists, has no agency, and the tracking number matches a package
  const { data: wr } = await supabase
    .from("warehouse_receipts")
    .select("id, organization_id, packages(tracking_number)")
    .eq("id", warehouseReceiptId)
    .is("agency_id", null)
    .single();

  if (!wr) {
    return { success: false, error: "WR desconocido no encontrado o ya reclamado" };
  }

  const pkgs = Array.isArray(wr.packages) ? wr.packages : [];
  const trackingMatch = pkgs.some(
    (p: { tracking_number: string }) => p.tracking_number.toLowerCase() === trackingNumber.toLowerCase(),
  );
  if (!trackingMatch) {
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

// ---------------------------------------------------------------------------
// Claim unknown WR via ticket (sin guía)
// ---------------------------------------------------------------------------
export async function createUnknownWrClaimTicket(
  warehouseReceiptId: string,
  description: string,
  attachments: Array<{ storagePath: string; fileName: string; contentType: string }>,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "No autenticado" };

  if (!description || description.trim().length < 10) {
    return { success: false, error: "La descripción debe tener al menos 10 caracteres" };
  }

  // Get profile + org
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile) return { success: false, error: "Perfil no encontrado" };

  // Get agency from user role
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

  // Verify WR exists and has no agency
  const { data: wr } = await supabase
    .from("warehouse_receipts")
    .select("id, wr_number, organization_id")
    .eq("id", warehouseReceiptId)
    .is("agency_id", null)
    .single();

  if (!wr) {
    return { success: false, error: "WR no encontrado o ya reclamado" };
  }

  // Generate ticket number
  const { count } = await supabase
    .from("tickets")
    .select("*", { count: "exact", head: true });

  const ticketNumber = `TK${String((count ?? 0) + 1).padStart(5, "0")}`;

  // Create ticket
  const { data: ticket, error: ticketError } = await supabase
    .from("tickets")
    .insert({
      organization_id: profile.organization_id,
      ticket_number: ticketNumber,
      agency_id: userRole.agency_id,
      category: "Reclamo de desconocido",
      subject: `Reclamo sin guía — ${wr.wr_number}`,
      description: description.trim(),
      priority: "normal",
      status: "open",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (ticketError || !ticket) {
    return { success: false, error: ticketError?.message ?? "Error al crear ticket" };
  }

  // Link ticket to WR
  await supabase.from("ticket_wrs").insert({
    ticket_id: ticket.id,
    warehouse_receipt_id: warehouseReceiptId,
  });

  // Insert attachment records
  if (attachments.length > 0) {
    await supabase.from("ticket_attachments").insert(
      attachments.map((a) => ({
        organization_id: profile.organization_id,
        ticket_id: ticket.id,
        storage_path: a.storagePath,
        file_name: a.fileName,
        content_type: a.contentType,
        uploaded_by: user.id,
      })),
    );
  }

  // Update or create unknown_wrs record with "claimed" status
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
      })
      .eq("id", existingClaim.id);
  } else {
    await supabase.from("unknown_wrs").insert({
      organization_id: wr.organization_id,
      warehouse_receipt_id: warehouseReceiptId,
      status: "claimed",
      claimed_by_agency_id: userRole.agency_id,
      claimed_at: new Date().toISOString(),
    });
  }

  revalidatePath("/unknown-wrs");
  revalidatePath("/tickets");

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

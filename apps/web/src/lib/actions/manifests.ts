"use server";

import { revalidatePath } from "next/cache";

import { getUserWarehouseScope } from "@/lib/auth/scope";
import { createClient } from "@/lib/supabase/server";

// ── MAWB ──

export async function createMawb(formData: FormData): Promise<{ id: string } | { error: string }> {
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
    .from("mawbs")
    .insert({
      organization_id: profile.organization_id,
      warehouse_id: formData.get("warehouse_id") as string,
      mawb_number: formData.get("mawb_number") as string,
      airline: formData.get("airline") as string,
      flight_number: (formData.get("flight_number") as string) || null,
      flight_date: (formData.get("flight_date") as string) || null,
      destination_id: formData.get("destination_id") as string,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  await supabase.from("mawb_status_history").insert({
    organization_id: profile.organization_id,
    mawb_id: data.id,
    old_status: null,
    new_status: "created",
    changed_by: user.id,
  });

  revalidatePath("/manifests");
  return { id: data.id };
}

export async function getMawbs(filters?: { status?: string }) {
  const supabase = await createClient();
  const warehouseScope = await getUserWarehouseScope();

  if (warehouseScope !== null && warehouseScope.length === 0) {
    return { data: [], error: null };
  }

  let query = supabase
    .from("mawbs")
    .select("*, destinations:destination_id(city, country_code), hawbs(id, hawb_number, shipping_instruction_id)")
    .order("created_at", { ascending: false });

  if (warehouseScope !== null) {
    query = query.in("warehouse_id", warehouseScope);
  }

  if (filters?.status) query = query.eq("status", filters.status);

  const { data, error } = await query;
  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function getMawb(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("mawbs")
    .select("*, destinations:destination_id(city, country_code), hawbs(*, shipping_instructions(si_number, agency_id, agencies(name, code)))")
    .eq("id", id)
    .single();

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function updateMawbStatus(id: string, newStatus: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: mawb } = await supabase
    .from("mawbs")
    .select("status, organization_id")
    .eq("id", id)
    .single();

  if (!mawb) return { error: "MAWB no encontrado" };

  await supabase.from("mawbs").update({ status: newStatus }).eq("id", id);

  // If delivered, mark all related WRs as dispatched
  if (newStatus === "delivered") {
    const { data: hawbs } = await supabase
      .from("hawbs")
      .select("id")
      .eq("mawb_id", id);

    if (hawbs?.length) {
      const hawbIds = hawbs.map((h) => h.id);
      const { data: wrs } = await supabase
        .from("warehouse_receipts")
        .select("id")
        .in("hawb_id", hawbIds);

      if (wrs?.length) {
        const wrIds = wrs.map((w) => w.id);
        await supabase
          .from("warehouse_receipts")
          .update({ status: "dispatched" })
          .in("id", wrIds);
      }
    }
  }

  await supabase.from("mawb_status_history").insert({
    organization_id: mawb.organization_id,
    mawb_id: id,
    old_status: mawb.status,
    new_status: newStatus,
    changed_by: user.id,
  });

  revalidatePath("/manifests");
  revalidatePath("/inventory");
  return {};
}

export async function assignHawbToMawb(hawbId: string, mawbId: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("hawbs")
    .update({ mawb_id: mawbId })
    .eq("id", hawbId);

  if (error) return { error: error.message };

  revalidatePath("/manifests");
  return {};
}

// ── Airline Reservations ──

export async function createAirlineReservation(formData: FormData): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile) return { error: "Perfil no encontrado" };

  const numbers = JSON.parse(formData.get("reserved_mawb_numbers") as string) as string[];

  const { data, error } = await supabase
    .from("airline_reservations")
    .insert({
      organization_id: profile.organization_id,
      airline: formData.get("airline") as string,
      reserved_mawb_numbers: numbers,
      week_start: formData.get("week_start") as string,
      week_end: formData.get("week_end") as string,
      notes: (formData.get("notes") as string) || null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/manifests");
  return { id: data.id };
}

export async function getAirlineReservations() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("airline_reservations")
    .select("*")
    .order("week_start", { ascending: false });

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

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

  revalidatePath("/shipping");
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

  revalidatePath("/shipping");
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

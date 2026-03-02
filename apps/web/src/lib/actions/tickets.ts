"use server";

import { TICKET_VALID_TRANSITIONS } from "@no-wms/shared/validators/ticket";
import { revalidatePath } from "next/cache";

import { getUserAgencyScope } from "@/lib/auth/scope";
import { createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// List tickets
// ---------------------------------------------------------------------------
export async function getTickets(filters?: {
  status?: string;
  priority?: string;
  agency_id?: string;
}) {
  const supabase = await createClient();
  const agencyScope = await getUserAgencyScope();

  let query = supabase
    .from("tickets")
    .select(
      "id, ticket_number, subject, category, status, priority, created_at, updated_at, assigned_to, agencies:agency_id(name, code), creator:created_by(full_name)",
    )
    .order("created_at", { ascending: false });

  // Agency-scoped users only see their own tickets
  if (agencyScope !== null) {
    if (!agencyScope.length) return { data: [], error: null };
    query = query.in("agency_id", agencyScope);
  }

  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.priority) query = query.eq("priority", filters.priority);
  if (filters?.agency_id) query = query.eq("agency_id", filters.agency_id);

  const { data, error } = await query;
  return { data: data ?? [], error: error?.message ?? null };
}

// ---------------------------------------------------------------------------
// Get single ticket with messages, WRs, and status history
// ---------------------------------------------------------------------------
export async function getTicket(id: string) {
  const supabase = await createClient();

  const { data: ticket, error } = await supabase
    .from("tickets")
    .select(
      `id, ticket_number, subject, description, category, status, priority,
       created_at, updated_at, resolved_at, closed_at,
       assigned_to, created_by,
       agencies:agency_id(id, name, code),
       assignee:assigned_to(full_name),
       creator:created_by(full_name)`,
    )
    .eq("id", id)
    .single();

  if (error || !ticket) return { data: null, error: error?.message ?? "Ticket no encontrado" };

  // Messages
  const { data: messages } = await supabase
    .from("ticket_messages")
    .select("id, content, created_at, author:created_by(full_name)")
    .eq("ticket_id", id)
    .order("created_at", { ascending: true });

  // Associated WRs
  const { data: ticketWrs } = await supabase
    .from("ticket_wrs")
    .select("warehouse_receipts:warehouse_receipt_id(id, wr_number, status, packages(tracking_number))")
    .eq("ticket_id", id);

  // Status history
  const { data: statusHistory } = await supabase
    .from("ticket_status_history")
    .select("id, old_status, new_status, reason, created_at, changer:changed_by(full_name)")
    .eq("ticket_id", id)
    .order("created_at", { ascending: true });

  return {
    data: {
      ...ticket,
      messages: messages ?? [],
      warehouse_receipts: ticketWrs?.map((tw) => tw.warehouse_receipts).filter(Boolean) ?? [],
      status_history: statusHistory ?? [],
    },
    error: null,
  };
}

// ---------------------------------------------------------------------------
// Create ticket
// ---------------------------------------------------------------------------
export async function createTicket(formData: FormData): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autenticado" };

  const agencyId = formData.get("agency_id") as string;
  const category = formData.get("category") as string;
  const subject = formData.get("subject") as string;
  const description = formData.get("description") as string;
  const priority = (formData.get("priority") as string) || "normal";
  const wrIdsRaw = formData.get("warehouse_receipt_ids") as string | null;
  const wrIds = wrIdsRaw ? (JSON.parse(wrIdsRaw) as string[]) : [];

  if (!agencyId || !category || !subject || !description) {
    return { error: "Todos los campos obligatorios son requeridos" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile) return { error: "Perfil no encontrado" };

  // Generate ticket number
  const { count } = await supabase
    .from("tickets")
    .select("*", { count: "exact", head: true });

  const ticketNumber = `TK${String((count ?? 0) + 1).padStart(5, "0")}`;

  const { data: ticket, error } = await supabase
    .from("tickets")
    .insert({
      organization_id: profile.organization_id,
      ticket_number: ticketNumber,
      agency_id: agencyId,
      category,
      subject,
      description,
      priority,
      status: "open",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !ticket) return { error: error?.message ?? "Error al crear ticket" };

  // Link WRs
  if (wrIds.length) {
    const wrLinks = wrIds.map((wrId) => ({
      ticket_id: ticket.id,
      warehouse_receipt_id: wrId,
    }));
    await supabase.from("ticket_wrs").insert(wrLinks);
  }

  revalidatePath("/tickets");
  return { id: ticket.id };
}

// ---------------------------------------------------------------------------
// Add message to ticket
// ---------------------------------------------------------------------------
export async function addTicketMessage(formData: FormData): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autenticado" };

  const ticketId = formData.get("ticket_id") as string;
  const content = formData.get("content") as string;

  if (!ticketId || !content) return { error: "Mensaje requerido" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile) return { error: "Perfil no encontrado" };

  const { data: message, error } = await supabase
    .from("ticket_messages")
    .insert({
      organization_id: profile.organization_id,
      ticket_id: ticketId,
      content,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath(`/tickets/${ticketId}`);
  return { id: message!.id };
}

// ---------------------------------------------------------------------------
// Update ticket status
// ---------------------------------------------------------------------------
export async function updateTicketStatus(
  id: string,
  newStatus: string,
  reason?: string,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autenticado" };

  // Get current status
  const { data: ticket } = await supabase
    .from("tickets")
    .select("status, organization_id")
    .eq("id", id)
    .single();

  if (!ticket) return { error: "Ticket no encontrado" };

  const allowed = TICKET_VALID_TRANSITIONS[ticket.status];
  if (!allowed?.includes(newStatus)) {
    return { error: `Transición no permitida: ${ticket.status} → ${newStatus}` };
  }

  // Build update payload
  const updateData: Record<string, unknown> = { status: newStatus };
  if (newStatus === "resolved") updateData.resolved_at = new Date().toISOString();
  if (newStatus === "closed") updateData.closed_at = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("tickets")
    .update(updateData)
    .eq("id", id);

  if (updateError) return { error: updateError.message };

  // Insert status history
  await supabase.from("ticket_status_history").insert({
    organization_id: ticket.organization_id,
    ticket_id: id,
    old_status: ticket.status,
    new_status: newStatus,
    changed_by: user.id,
    reason: reason || null,
  });

  revalidatePath(`/tickets/${id}`);
  revalidatePath("/tickets");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Assign ticket
// ---------------------------------------------------------------------------
export async function assignTicket(
  id: string,
  userId: string,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("tickets")
    .update({ assigned_to: userId })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath(`/tickets/${id}`);
  revalidatePath("/tickets");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Ticket stats for dashboard
// ---------------------------------------------------------------------------
export async function getTicketStats() {
  const supabase = await createClient();
  const agencyScope = await getUserAgencyScope();

  let query = supabase
    .from("tickets")
    .select("status")
    .in("status", ["open", "in_review"]);

  if (agencyScope !== null) {
    if (!agencyScope.length) return { open: 0, in_review: 0 };
    query = query.in("agency_id", agencyScope);
  }

  const { data } = await query;

  const open = data?.filter((t) => t.status === "open").length ?? 0;
  const inReview = data?.filter((t) => t.status === "in_review").length ?? 0;

  return { open, in_review: inReview };
}

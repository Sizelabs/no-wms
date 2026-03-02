"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Get notifications for current user
// ---------------------------------------------------------------------------
export async function getNotifications(limit = 50) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { data: [], error: "No autenticado" };

  const { data, error } = await supabase
    .from("notifications")
    .select("id, event_type, channel, subject, body, metadata, status, read_at, created_at")
    .eq("recipient_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  return { data: data ?? [], error: error?.message ?? null };
}

// ---------------------------------------------------------------------------
// Unread count
// ---------------------------------------------------------------------------
export async function getUnreadCount(): Promise<number> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return 0;

  const { count } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("recipient_user_id", user.id)
    .is("read_at", null)
    .in("status", ["pending", "sent"]);

  return count ?? 0;
}

// ---------------------------------------------------------------------------
// Mark single notification as read
// ---------------------------------------------------------------------------
export async function markAsRead(id: string): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autenticado" };

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString(), status: "read" })
    .eq("id", id)
    .eq("recipient_user_id", user.id);

  if (error) return { error: error.message };
  return { success: true };
}

// ---------------------------------------------------------------------------
// Mark all as read
// ---------------------------------------------------------------------------
export async function markAllAsRead(): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autenticado" };

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString(), status: "read" })
    .eq("recipient_user_id", user.id)
    .is("read_at", null);

  if (error) return { error: error.message };

  revalidatePath("/");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Get notification preferences for current user
// ---------------------------------------------------------------------------
export async function getNotificationPreferences() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { data: [], error: "No autenticado" };

  const { data, error } = await supabase
    .from("notification_preferences")
    .select("id, event_type, channel, is_enabled")
    .eq("user_id", user.id);

  return { data: data ?? [], error: error?.message ?? null };
}

// ---------------------------------------------------------------------------
// Update notification preference (upsert)
// ---------------------------------------------------------------------------
export async function updateNotificationPreference(
  eventType: string,
  channel: string,
  isEnabled: boolean,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autenticado" };

  const { error } = await supabase
    .from("notification_preferences")
    .upsert(
      {
        user_id: user.id,
        event_type: eventType,
        channel,
        is_enabled: isEnabled,
      },
      { onConflict: "user_id,event_type,channel" },
    );

  if (error) return { error: error.message };

  revalidatePath("/settings/notifications");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Create mass notification (admin only)
// ---------------------------------------------------------------------------
export async function createMassNotification(
  formData: FormData,
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autenticado" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile) return { error: "Perfil no encontrado" };

  const title = formData.get("title") as string;
  const body = formData.get("body") as string;
  const type = (formData.get("type") as string) || "announcement";
  const targetAgenciesRaw = formData.get("target_agencies") as string | null;
  const expiresAt = formData.get("expires_at") as string | null;

  if (!title || !body) return { error: "Título y mensaje son requeridos" };

  const targetAgencies = targetAgenciesRaw ? (JSON.parse(targetAgenciesRaw) as string[]) : null;

  const { data, error } = await supabase
    .from("mass_notifications")
    .insert({
      organization_id: profile.organization_id,
      title,
      body,
      type,
      target_agencies: targetAgencies,
      created_by: user.id,
      expires_at: expiresAt || null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/");
  return { id: data!.id };
}

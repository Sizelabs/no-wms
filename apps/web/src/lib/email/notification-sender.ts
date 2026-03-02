import { EMAIL_FROM, getResend } from "./client";

import { createClient } from "@/lib/supabase/server";

interface SendNotificationParams {
  orgId: string;
  recipientUserId: string;
  recipientEmail?: string;
  eventType: string;
  subject: string;
  body: string;
  metadata?: Record<string, unknown>;
}

/**
 * Creates in-app notification record and optionally sends email.
 * Non-blocking — errors are logged but never thrown.
 */
export async function sendNotification({
  orgId,
  recipientUserId,
  recipientEmail,
  eventType,
  subject,
  body,
  metadata,
}: SendNotificationParams): Promise<void> {
  try {
    const supabase = await createClient();

    // Check if user has disabled this notification channel
    const { data: pref } = await supabase
      .from("notification_preferences")
      .select("is_enabled")
      .eq("user_id", recipientUserId)
      .eq("event_type", eventType)
      .eq("channel", "email")
      .maybeSingle();

    const emailEnabled = pref?.is_enabled !== false; // default = enabled

    // Insert in-app notification
    await supabase.from("notifications").insert({
      organization_id: orgId,
      recipient_user_id: recipientUserId,
      recipient_email: recipientEmail ?? null,
      event_type: eventType,
      channel: "in_app",
      subject,
      body,
      metadata: metadata ?? {},
      status: "sent",
    });

    // Send email if we have an email address and it's enabled
    if (recipientEmail && emailEnabled) {
      await supabase.from("notifications").insert({
        organization_id: orgId,
        recipient_user_id: recipientUserId,
        recipient_email: recipientEmail,
        event_type: eventType,
        channel: "email",
        subject,
        body,
        metadata: metadata ?? {},
        status: "pending",
      });

      await getResend().emails.send({
        from: EMAIL_FROM,
        to: recipientEmail,
        subject,
        text: body,
      });

      // Mark email as sent
      await supabase
        .from("notifications")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("recipient_user_id", recipientUserId)
        .eq("event_type", eventType)
        .eq("channel", "email")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1);
    }
  } catch (error) {
    console.error("Failed to send notification:", error);
  }
}

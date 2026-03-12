import type { SupabaseClient, User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

interface ActionAuth {
  supabase: SupabaseClient;
  user: User;
  organizationId: string;
}

/**
 * Shared auth helper for server actions.
 * Returns supabase client, authenticated user, and their organization_id.
 * Returns null if unauthenticated or profile not found.
 */
export async function getActionAuth(): Promise<ActionAuth | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) return null;

  return { supabase, user, organizationId: profile.organization_id as string };
}

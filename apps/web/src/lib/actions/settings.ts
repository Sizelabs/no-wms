"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export async function getSettings(organizationId: string, scopeType: string, scopeId: string | null) {
  const supabase = await createClient();

  let query = supabase
    .from("settings")
    .select("id, key, value, scope_type, scope_id, organization_id, updated_at")
    .eq("scope_type", scopeType);

  if (scopeType === "platform") {
    query = query.is("organization_id", null);
  } else {
    query = query.eq("organization_id", organizationId);
  }

  if (scopeId) {
    query = query.eq("scope_id", scopeId);
  } else {
    query = query.is("scope_id", null);
  }

  const { data, error } = await query;

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function upsertSetting(
  organizationId: string | null,
  scopeType: string,
  scopeId: string | null,
  key: string,
  value: unknown,
): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  const { error } = await supabase
    .from("settings")
    .upsert(
      {
        organization_id: organizationId,
        scope_type: scopeType,
        scope_id: scopeId,
        key,
        value,
        updated_by: user.id,
      },
      { onConflict: "organization_id,scope_type,scope_id,key" },
    );

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/settings");
}

export async function deleteSetting(settingId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("settings")
    .delete()
    .eq("id", settingId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/settings");
}

"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

async function getAuthProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  return { supabase, profile };
}

export async function getDestinationsList() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("destinations")
    .select("id, city, country_code, currency, is_active, created_at")
    .order("city");

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function getDestination(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("destinations")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function createDestination(formData: FormData): Promise<{ id: string } | { error: string }> {
  const { supabase, profile } = await getAuthProfile();
  if (!profile) return { error: "No autenticado" };

  const { data, error } = await supabase
    .from("destinations")
    .insert({
      organization_id: profile.organization_id,
      city: formData.get("city") as string,
      country_code: formData.get("country_code") as string,
      currency: (formData.get("currency") as string) || "USD",
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") return { error: "Ya existe un destino con esa ciudad y código de país" };
    return { error: error.message };
  }
  revalidatePath("/settings/destinations");
  return { id: data.id };
}

export async function updateDestination(id: string, formData: FormData): Promise<{ error?: string }> {
  const { supabase, profile } = await getAuthProfile();
  if (!profile) return { error: "No autenticado" };

  const updates: Record<string, unknown> = {};
  for (const field of ["city", "country_code", "currency"]) {
    const val = formData.get(field) as string | null;
    if (val !== null) updates[field] = val || null;
  }
  const isActive = formData.get("is_active");
  if (isActive !== null) updates.is_active = isActive === "true";

  const { error } = await supabase
    .from("destinations")
    .update(updates)
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/settings/destinations");
  return {};
}

export async function deleteDestination(id: string): Promise<{ error?: string }> {
  const { supabase, profile } = await getAuthProfile();
  if (!profile) return { error: "No autenticado" };

  const { error } = await supabase
    .from("destinations")
    .update({ is_active: false })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/settings/destinations");
  return {};
}

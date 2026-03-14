"use server";

import { Country } from "country-state-city";
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

/** Resolve country name from ISO code for display */
function resolveCountryName(countryCode: string): string | null {
  const c = Country.getCountryByCode(countryCode);
  return c?.name ?? null;
}

/** Return distinct country codes from destinations, enriched with name and flag. */
export async function getDestinationCountries() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("destinations")
    .select("country_code")
    .eq("is_active", true);

  if (error) return [];

  const uniqueCodes = [...new Set((data ?? []).map((d) => d.country_code))].sort();
  return uniqueCodes.map((code) => {
    const c = Country.getCountryByCode(code);
    return { isoCode: code, name: c?.name ?? code, flag: c?.flag ?? "" };
  });
}

export async function getDestinationsList() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("destinations")
    .select("id, city, state, country_code, currency, is_active, created_at")
    .order("city");

  if (error) return { data: null, error: error.message };

  const enriched = (data ?? []).map((d) => ({
    ...d,
    country_name: resolveCountryName(d.country_code),
  }));

  return { data: enriched, error: null };
}

export async function getDestination(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("destinations")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return { data: null, error: error.message };

  return {
    data: data ? { ...data, country_name: resolveCountryName(data.country_code) } : null,
    error: null,
  };
}

export async function createDestination(formData: FormData): Promise<{ id: string } | { error: string }> {
  const { supabase, profile } = await getAuthProfile();
  if (!profile) return { error: "No autenticado" };

  const city = formData.get("city") as string;
  const state = formData.get("state") as string;
  const countryCode = formData.get("country_code") as string;

  if (!city || !countryCode) return { error: "Ciudad y país son requeridos" };

  const { data, error } = await supabase
    .from("destinations")
    .insert({
      organization_id: profile.organization_id,
      city,
      state: state || null,
      country_code: countryCode,
      currency: (formData.get("currency") as string) || "USD",
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") return { error: "Ya existe un destino con esa ciudad y país" };
    return { error: error.message };
  }
  revalidatePath("/settings/destinations");
  return { id: data.id };
}

export async function updateDestination(id: string, formData: FormData): Promise<{ error?: string }> {
  const { supabase, profile } = await getAuthProfile();
  if (!profile) return { error: "No autenticado" };

  const updates: Record<string, unknown> = {};

  const city = formData.get("city") as string | null;
  const state = formData.get("state") as string | null;
  const countryCode = formData.get("country_code") as string | null;

  if (city !== null) updates.city = city || null;
  if (state !== null) updates.state = state || null;
  if (countryCode !== null) updates.country_code = countryCode || null;

  const currency = formData.get("currency") as string | null;
  if (currency !== null) updates.currency = currency || null;

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

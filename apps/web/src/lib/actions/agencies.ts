"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export async function getAgencies() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("agencies")
    .select("*, destination_countries(name), courriers(name, code)")
    .order("name");

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function getAgency(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("agencies")
    .select("*, destination_countries(name), agency_contacts(*)")
    .eq("id", id)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function createAgency(formData: FormData): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from("agencies").insert({
    organization_id: formData.get("organization_id") as string,
    destination_country_id: formData.get("destination_country_id") as string,
    courrier_id: (formData.get("courrier_id") as string) || null,
    name: formData.get("name") as string,
    code: formData.get("code") as string,
    type: formData.get("type") as string,
    ruc: (formData.get("ruc") as string) || null,
    address: (formData.get("address") as string) || null,
    phone: (formData.get("phone") as string) || null,
    email: (formData.get("email") as string) || null,
    allow_multi_package: formData.get("allow_multi_package") === "on",
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/agencies");
}

export async function deleteAgency(
  id: string,
): Promise<{ error: string } | null> {
  const supabase = await createClient();

  const { error } = await supabase.from("agencies").delete().eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/agencies");
  revalidatePath("/companies");
  return null;
}

export async function getAgencySettings(agencyIds: string[]) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("agencies")
    .select("id, name, code, allow_multi_package")
    .in("id", agencyIds)
    .order("name");

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function updateAgencySettings(
  id: string,
  settings: { allow_multi_package: boolean },
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("agencies")
    .update({ allow_multi_package: settings.allow_multi_package })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/settings");
}

export async function updateAgency(id: string, formData: FormData): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("agencies")
    .update({
      name: formData.get("name") as string,
      code: formData.get("code") as string,
      type: formData.get("type") as string,
      ruc: (formData.get("ruc") as string) || null,
      address: (formData.get("address") as string) || null,
      phone: (formData.get("phone") as string) || null,
      email: (formData.get("email") as string) || null,
      allow_multi_package: formData.get("allow_multi_package") === "on",
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/agencies");
}

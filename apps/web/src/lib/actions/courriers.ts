"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export async function getCourriers() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("courriers")
    .select("*, courrier_coverage(id, destination_country_id, city, is_active, destination_countries(name, code))")
    .order("name");

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function getCourrier(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("courriers")
    .select("*, courrier_coverage(id, destination_country_id, city, is_active, destination_countries(name, code)), agencies(id, name, code, type, is_active)")
    .eq("id", id)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function createCourrier(formData: FormData): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from("courriers").insert({
    organization_id: formData.get("organization_id") as string,
    name: formData.get("name") as string,
    code: formData.get("code") as string,
    type: formData.get("type") as string,
    ruc: (formData.get("ruc") as string) || null,
    address: (formData.get("address") as string) || null,
    city: (formData.get("city") as string) || null,
    country: (formData.get("country") as string) || null,
    phone: (formData.get("phone") as string) || null,
    email: (formData.get("email") as string) || null,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/courriers");
  revalidatePath("/companies");
}

export async function updateCourrier(id: string, formData: FormData): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("courriers")
    .update({
      name: formData.get("name") as string,
      code: formData.get("code") as string,
      type: formData.get("type") as string,
      ruc: (formData.get("ruc") as string) || null,
      address: (formData.get("address") as string) || null,
      city: (formData.get("city") as string) || null,
      country: (formData.get("country") as string) || null,
      phone: (formData.get("phone") as string) || null,
      email: (formData.get("email") as string) || null,
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/courriers");
  revalidatePath("/companies");
}

export async function deleteCourrier(id: string): Promise<{ error: string } | null> {
  const supabase = await createClient();

  const { error } = await supabase.from("courriers").delete().eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/courriers");
  revalidatePath("/companies");
  return null;
}

export async function addCourrierCoverage(
  courrierId: string,
  destinationCountryId: string,
  organizationId: string,
  city?: string,
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from("courrier_coverage").insert({
    organization_id: organizationId,
    courrier_id: courrierId,
    destination_country_id: destinationCountryId,
    city: city || null,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/courriers");
}

export async function removeCourrierCoverage(id: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from("courrier_coverage").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/courriers");
}

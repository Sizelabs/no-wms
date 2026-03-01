"use server";

import { createConsigneeSchema } from "@no-wms/shared/validators/warehouse-receipt";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export async function getConsigneesByAgency(agencyId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("consignees")
    .select("id, full_name, cedula_ruc, city")
    .eq("agency_id", agencyId)
    .eq("is_active", true)
    .order("full_name");

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function searchConsignees(agencyId: string, query: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("consignees")
    .select("id, full_name, cedula_ruc, city")
    .eq("agency_id", agencyId)
    .eq("is_active", true)
    .ilike("full_name", `%${query}%`)
    .order("full_name")
    .limit(20);

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function quickCreateConsignee(formData: FormData) {
  const supabase = await createClient();

  const raw = {
    agency_id: formData.get("agency_id") as string,
    full_name: (formData.get("full_name") as string)?.trim(),
    cedula_ruc: (formData.get("cedula_ruc") as string) || undefined,
    email: (formData.get("email") as string) || undefined,
    phone: (formData.get("phone") as string) || undefined,
    address_line1: (formData.get("address_line1") as string) || undefined,
    city: (formData.get("city") as string) || undefined,
    province: (formData.get("province") as string) || undefined,
  };

  const parsed = createConsigneeSchema.safeParse(raw);
  if (!parsed.success) {
    return { data: null, error: parsed.error.errors.map((e) => e.message).join(", ") };
  }

  // Get org ID
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: "No autenticado" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return { data: null, error: "Perfil no encontrado" };
  }

  const { data, error } = await supabase
    .from("consignees")
    .insert({
      organization_id: profile.organization_id,
      ...parsed.data,
    })
    .select("id, full_name")
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  revalidatePath("/warehouse-receipts");
  return { data, error: null };
}

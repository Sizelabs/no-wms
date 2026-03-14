"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

// ── Carriers ──

export async function getCarriers() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("carriers")
    .select("*, carrier_modalities(modality_id, modalities(id, name, code))")
    .order("name");

  if (error) return { data: null, error: error.message };

  // Flatten the nested modalities for convenience
  const carriers = (data ?? []).map((c) => ({
    ...c,
    modalities: (c.carrier_modalities ?? []).map(
      (cm: { modality_id: string; modalities: { id: string; name: string; code: string } }) => cm.modalities,
    ),
  }));

  return { data: carriers, error: null };
}

export async function getCarrier(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("carriers")
    .select("*, awb_batches(*), carrier_modalities(modality_id, modalities(id, name, code))")
    .eq("id", id)
    .single();

  if (error) return { data: null, error: error.message };

  const carrier = data
    ? {
        ...data,
        modalities: (data.carrier_modalities ?? []).map(
          (cm: { modality_id: string; modalities: { id: string; name: string; code: string } }) => cm.modalities,
        ),
      }
    : null;

  return { data: carrier, error: null };
}

export async function createCarrier(formData: FormData): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile) return { error: "Perfil no encontrado" };

  const modalityIds = formData.getAll("modality_ids") as string[];
  if (modalityIds.length === 0) return { error: "Seleccione al menos una modalidad" };

  const { data, error } = await supabase
    .from("carriers")
    .insert({
      organization_id: profile.organization_id,
      name: formData.get("name") as string,
      code: formData.get("code") as string,
      contact_name: (formData.get("contact_name") as string) || null,
      contact_phone: (formData.get("contact_phone") as string) || null,
      contact_email: (formData.get("contact_email") as string) || null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  // Insert modality associations
  const { error: modError } = await supabase
    .from("carrier_modalities")
    .insert(modalityIds.map((mid) => ({ carrier_id: data.id, modality_id: mid })));

  if (modError) return { error: modError.message };

  revalidatePath("/settings/carriers");
  return { id: data.id };
}

export async function updateCarrier(id: string, formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("carriers")
    .update({
      name: formData.get("name") as string,
      code: formData.get("code") as string,
      contact_name: (formData.get("contact_name") as string) || null,
      contact_phone: (formData.get("contact_phone") as string) || null,
      contact_email: (formData.get("contact_email") as string) || null,
      is_active: formData.get("is_active") === "true",
    })
    .eq("id", id);

  if (error) return { error: error.message };

  // Sync modality associations: delete old, insert new
  const modalityIds = formData.getAll("modality_ids") as string[];
  if (modalityIds.length > 0) {
    await supabase.from("carrier_modalities").delete().eq("carrier_id", id);
    const { error: modError } = await supabase
      .from("carrier_modalities")
      .insert(modalityIds.map((mid) => ({ carrier_id: id, modality_id: mid })));
    if (modError) return { error: modError.message };
  }

  revalidatePath("/settings/carriers");
  return {};
}

// ── AWB Batches ──

export async function getAwbBatches(carrierId?: string) {
  const supabase = await createClient();

  let query = supabase
    .from("awb_batches")
    .select("*, carriers(name, code)")
    .order("created_at", { ascending: false });

  if (carrierId) query = query.eq("carrier_id", carrierId);

  const { data, error } = await query;
  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function createAwbBatch(formData: FormData): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile) return { error: "Perfil no encontrado" };

  const rangeStart = parseInt(formData.get("range_start") as string, 10);
  const rangeEnd = parseInt(formData.get("range_end") as string, 10);

  const { data, error } = await supabase
    .from("awb_batches")
    .insert({
      organization_id: profile.organization_id,
      carrier_id: formData.get("carrier_id") as string,
      prefix: formData.get("prefix") as string,
      range_start: rangeStart,
      range_end: rangeEnd,
      next_available: rangeStart,
      notes: (formData.get("notes") as string) || null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/settings/carriers");
  return { id: data.id };
}

export async function getNextAwbNumber(batchId: string): Promise<{ awb_number?: string; error?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("next_awb_number", { p_batch_id: batchId });

  if (error) return { error: error.message };
  return { awb_number: data as string };
}

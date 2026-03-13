"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

async function getAuthProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, profile: null, userId: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  return { supabase, profile, userId: user.id };
}

export async function getShippingCategoriesList() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("shipping_categories")
    .select("*, modalities(id, name, code), shipping_category_required_documents(*)")
    .order("country_code")
    .order("display_order");

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function getShippingCategory(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("shipping_categories")
    .select("*, shipping_category_required_documents(*)")
    .eq("id", id)
    .single();

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function createShippingCategory(formData: FormData): Promise<{ id: string } | { error: string }> {
  const { supabase, profile } = await getAuthProfile();
  if (!profile) return { error: "No autenticado" };

  const code = formData.get("code") as string;
  const name = formData.get("name") as string;
  const countryCode = formData.get("country_code") as string;

  if (!code || !name || !countryCode) return { error: "Código, nombre y país son requeridos" };

  const modalityId = formData.get("modality_id") as string;
  if (!modalityId) return { error: "Modalidad es requerida" };

  const { data, error } = await supabase
    .from("shipping_categories")
    .insert({
      organization_id: profile.organization_id,
      country_code: countryCode,
      modality_id: modalityId,
      code,
      name,
      description: (formData.get("description") as string) || null,
      display_order: Number(formData.get("display_order") || 0),
      max_weight_kg: formData.get("max_weight_kg") ? Number(formData.get("max_weight_kg")) : null,
      min_declared_value_usd: formData.get("min_declared_value_usd") ? Number(formData.get("min_declared_value_usd")) : null,
      max_declared_value_usd: formData.get("max_declared_value_usd") ? Number(formData.get("max_declared_value_usd")) : null,
      cargo_type: (formData.get("cargo_type") as string) || "general",
      allows_dgr: formData.get("allows_dgr") === "true",
      requires_cedula: formData.get("requires_cedula") === "true",
      requires_ruc: formData.get("requires_ruc") === "true",
      customs_declaration_type: (formData.get("customs_declaration_type") as string) || "none",
      country_specific_rules: formData.get("country_specific_rules")
        ? JSON.parse(formData.get("country_specific_rules") as string)
        : {},
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") return { error: "Ya existe una categoría con ese código para este país" };
    return { error: error.message };
  }

  // Insert required documents
  const docsJson = formData.get("required_documents") as string;
  if (docsJson) {
    const docs = JSON.parse(docsJson) as Array<{ document_type: string; label: string; description?: string; is_required: boolean }>;
    if (docs.length > 0) {
      await supabase.from("shipping_category_required_documents").insert(
        docs.map((d) => ({
          shipping_category_id: data.id,
          document_type: d.document_type,
          label: d.label,
          description: d.description || null,
          is_required: d.is_required,
        })),
      );
    }
  }

  revalidatePath("/settings/shipping-categories");
  return { id: data.id };
}

export async function updateShippingCategory(id: string, formData: FormData): Promise<{ error?: string }> {
  const { supabase, profile } = await getAuthProfile();
  if (!profile) return { error: "No autenticado" };

  const updates: Record<string, unknown> = {};

  const fields = ["code", "name", "country_code", "description", "cargo_type", "customs_declaration_type", "modality_id"] as const;
  for (const field of fields) {
    const val = formData.get(field) as string | null;
    if (val !== null) updates[field] = val || null;
  }

  const numericFields = ["display_order", "max_weight_kg", "min_declared_value_usd", "max_declared_value_usd"] as const;
  for (const field of numericFields) {
    const val = formData.get(field) as string | null;
    if (val !== null) updates[field] = val ? Number(val) : null;
  }

  const boolFields = ["allows_dgr", "requires_cedula", "requires_ruc", "is_active"] as const;
  for (const field of boolFields) {
    const val = formData.get(field);
    if (val !== null) updates[field] = val === "true";
  }

  const csr = formData.get("country_specific_rules") as string | null;
  if (csr !== null) updates.country_specific_rules = JSON.parse(csr);

  const { error } = await supabase
    .from("shipping_categories")
    .update(updates)
    .eq("id", id);

  if (error) return { error: error.message };

  // Replace required documents if provided
  const docsJson = formData.get("required_documents") as string;
  if (docsJson) {
    const docs = JSON.parse(docsJson) as Array<{ document_type: string; label: string; description?: string; is_required: boolean }>;
    // Delete existing, then re-insert
    await supabase.from("shipping_category_required_documents").delete().eq("shipping_category_id", id);
    if (docs.length > 0) {
      await supabase.from("shipping_category_required_documents").insert(
        docs.map((d) => ({
          shipping_category_id: id,
          document_type: d.document_type,
          label: d.label,
          description: d.description || null,
          is_required: d.is_required,
        })),
      );
    }
  }

  revalidatePath("/settings/shipping-categories");
  return {};
}

export async function deleteShippingCategory(id: string): Promise<{ error?: string }> {
  const { supabase, profile } = await getAuthProfile();
  if (!profile) return { error: "No autenticado" };

  const { error } = await supabase
    .from("shipping_categories")
    .update({ is_active: false })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/settings/shipping-categories");
  return {};
}

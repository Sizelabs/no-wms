"use server";

import { createConsigneeSchema, updateConsigneeSchema } from "@no-wms/shared/validators/consignee";
import { revalidatePath } from "next/cache";

import { getUserAgencyScope } from "@/lib/auth/scope";
import { createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Generate casillero number — pattern from generateWrNumber
// ---------------------------------------------------------------------------

export async function generateCasillero(agencyId: string): Promise<string> {
  const supabase = await createClient();

  // Get agency code
  const { data: agency } = await supabase
    .from("agencies")
    .select("code")
    .eq("id", agencyId)
    .single();

  if (!agency) {
    throw new Error("Agencia no encontrada");
  }

  const code = agency.code;

  // Get the latest casillero for this agency
  const { data: latest } = await supabase
    .from("consignees")
    .select("casillero")
    .eq("agency_id", agencyId)
    .order("casillero", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latest?.casillero) {
    return `${code}000001`;
  }

  // Extract numeric suffix and increment
  const match = latest.casillero.match(/(\d{6})$/);
  const nextNum = match ? parseInt(match[1]!, 10) + 1 : 1;
  return `${code}${String(nextNum).padStart(6, "0")}`;
}

// ---------------------------------------------------------------------------
// List all consignees (with agency name)
// ---------------------------------------------------------------------------

export async function getConsignees() {
  const supabase = await createClient();

  // Apply agency scope if user is agency-scoped
  const agencyScope = await getUserAgencyScope();

  let query = supabase
    .from("consignees")
    .select("id, full_name, casillero, cedula_ruc, city, is_active, agency_id, agencies(name, code)")
    .order("full_name");

  if (agencyScope) {
    query = query.in("agency_id", agencyScope);
  }

  const { data, error } = await query;

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

// ---------------------------------------------------------------------------
// List consignees by agency (updated — includes casillero, no is_active filter)
// ---------------------------------------------------------------------------

export async function getConsigneesByAgency(agencyId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("consignees")
    .select("id, full_name, casillero, cedula_ruc, city, is_active")
    .eq("agency_id", agencyId)
    .order("full_name");

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

// ---------------------------------------------------------------------------
// Get single consignee with all fields + agency join
// ---------------------------------------------------------------------------

export async function getConsignee(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("consignees")
    .select("*, agencies(id, name, code)")
    .eq("id", id)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

// ---------------------------------------------------------------------------
// Create consignee (full form)
// ---------------------------------------------------------------------------

export async function createConsignee(formData: FormData) {
  const supabase = await createClient();

  const raw = {
    agency_id: formData.get("agency_id") as string,
    full_name: (formData.get("full_name") as string)?.trim(),
    casillero: (formData.get("casillero") as string) || undefined,
    cedula_ruc: (formData.get("cedula_ruc") as string) || undefined,
    email: (formData.get("email") as string) || undefined,
    phone: (formData.get("phone") as string) || undefined,
    address_line1: (formData.get("address_line1") as string) || undefined,
    address_line2: (formData.get("address_line2") as string) || undefined,
    city: (formData.get("city") as string) || undefined,
    province: (formData.get("province") as string) || undefined,
    postal_code: (formData.get("postal_code") as string) || undefined,
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

  // Auto-generate casillero if not provided
  const casillero = parsed.data.casillero || (await generateCasillero(parsed.data.agency_id));

  const { data, error } = await supabase
    .from("consignees")
    .insert({
      organization_id: profile.organization_id,
      ...parsed.data,
      casillero,
    })
    .select("id, full_name, casillero")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { data: null, error: "Casillero ya existe para esta agencia" };
    }
    return { data: null, error: error.message };
  }

  revalidatePath("/consignees");
  revalidatePath("/agencies");
  return { data, error: null };
}

// ---------------------------------------------------------------------------
// Update consignee
// ---------------------------------------------------------------------------

export async function updateConsignee(id: string, formData: FormData) {
  const supabase = await createClient();

  const raw: Record<string, unknown> = {};
  const fields = [
    "full_name", "casillero", "cedula_ruc", "email", "phone",
    "address_line1", "address_line2", "city", "province", "postal_code",
  ] as const;

  for (const field of fields) {
    const value = formData.get(field);
    if (value !== null) {
      raw[field] = (value as string).trim() || undefined;
    }
  }

  const isActiveValue = formData.get("is_active");
  if (isActiveValue !== null) {
    raw.is_active = isActiveValue === "true";
  }

  const parsed = updateConsigneeSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors.map((e) => e.message).join(", ") };
  }

  const { error } = await supabase
    .from("consignees")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { error: "Casillero ya existe para esta agencia" };
    }
    return { error: error.message };
  }

  revalidatePath("/consignees");
  revalidatePath("/agencies");
  return { error: null };
}

// ---------------------------------------------------------------------------
// Soft-delete consignee (FK referenced by warehouse_receipts)
// ---------------------------------------------------------------------------

export async function deleteConsignee(id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("consignees")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/consignees");
  revalidatePath("/agencies");
  return { error: null };
}

// ---------------------------------------------------------------------------
// Search consignees (updated — includes casillero, searches by casillero too)
// ---------------------------------------------------------------------------

export async function searchConsignees(agencyId: string | null, query: string) {
  const supabase = await createClient();

  let q = supabase
    .from("consignees")
    .select("id, full_name, casillero, cedula_ruc, city, agency_id, agencies(code)")
    .eq("is_active", true)
    .or(`full_name.ilike.%${query}%,casillero.ilike.%${query}%`)
    .order("full_name")
    .limit(20);

  if (agencyId) {
    q = q.eq("agency_id", agencyId);
  }

  const { data, error } = await q;

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

// ---------------------------------------------------------------------------
// Quick-create consignee (updated — auto-generates casillero)
// ---------------------------------------------------------------------------

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

  // Use provided casillero or auto-generate
  const casillero = (formData.get("casillero") as string)?.trim() || await generateCasillero(parsed.data.agency_id);

  const { data, error } = await supabase
    .from("consignees")
    .insert({
      organization_id: profile.organization_id,
      ...parsed.data,
      casillero,
    })
    .select("id, full_name, casillero")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { data: null, error: "Casillero ya existe para esta agencia" };
    }
    return { data: null, error: error.message };
  }

  revalidatePath("/warehouse-receipts");
  revalidatePath("/consignees");
  return { data, error: null };
}

// ---------------------------------------------------------------------------
// Check casillero uniqueness for an agency
// ---------------------------------------------------------------------------

export async function checkCasilleroUnique(agencyId: string, casillero: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("consignees")
    .select("id")
    .eq("agency_id", agencyId)
    .eq("casillero", casillero)
    .limit(1)
    .maybeSingle();

  return { unique: !data };
}

"use server";

import {
  calculateBillableWeight,
  calculateVolumetricWeight,
  createWarehouseReceiptSchema,
} from "@no-wms/shared/validators/warehouse-receipt";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getUserAgencyScope, getUserWarehouseScope } from "@/lib/auth/scope";
import { createClient } from "@/lib/supabase/server";

export async function checkDuplicateTracking(trackingNumber: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("packages")
    .select("id, warehouse_receipt_id, warehouse_receipts(wr_number, received_at)")
    .eq("tracking_number", trackingNumber)
    .maybeSingle();

  if (!data) return null;

  const raw = data.warehouse_receipts;
  const wr = (Array.isArray(raw) ? raw[0] : raw) as { wr_number: string; received_at: string } | null | undefined;
  return wr ? { id: data.warehouse_receipt_id, wr_number: wr.wr_number, received_at: wr.received_at } : null;
}

export async function generateWrNumber(): Promise<string> {
  const supabase = await createClient();

  // Get current max WR number for this org
  const { data } = await supabase
    .from("warehouse_receipts")
    .select("wr_number")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data?.wr_number) {
    return "GLP0001";
  }

  // Extract numeric part and increment
  const match = data.wr_number.match(/(\d+)$/);
  const nextNum = match ? parseInt(match[1]!, 10) + 1 : 1;
  return `GLP${String(nextNum).padStart(4, "0")}`;
}

export async function createWarehouseReceipt(formData: FormData): Promise<{ id: string; wr_number: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/es/login");
  }

  // Parse packages from formData
  const packagesJson = formData.get("packages") as string | null;
  let packagesRaw: Array<Record<string, unknown>> = [];
  if (packagesJson) {
    packagesRaw = JSON.parse(packagesJson);
  } else {
    // Single-package fallback (batch import / legacy)
    packagesRaw = [
      {
        tracking_number: (formData.get("tracking_number") as string)?.trim(),
        carrier: formData.get("carrier") as string,
        actual_weight_lb: formData.get("actual_weight_lb") ? Number(formData.get("actual_weight_lb")) : undefined,
        length_in: formData.get("length_in") ? Number(formData.get("length_in")) : undefined,
        width_in: formData.get("width_in") ? Number(formData.get("width_in")) : undefined,
        height_in: formData.get("height_in") ? Number(formData.get("height_in")) : undefined,
        content_description: (formData.get("content_description") as string) || undefined,
        declared_value_usd: formData.get("declared_value_usd") ? Number(formData.get("declared_value_usd")) : undefined,
        is_dgr: formData.get("is_dgr") === "true",
        dgr_class: (formData.get("dgr_class") as string) || undefined,
        is_damaged: formData.get("is_damaged") === "true",
        damage_description: (formData.get("damage_description") as string) || undefined,
        sender_name: (formData.get("sender_name") as string) || undefined,
        pieces_count: formData.get("pieces_count") ? Number(formData.get("pieces_count")) : 1,
      },
    ];
  }

  const raw = {
    warehouse_id: formData.get("warehouse_id") as string,
    agency_id: (formData.get("agency_id") as string) || null,
    consignee_id: (formData.get("consignee_id") as string) || null,
    warehouse_location_id: (formData.get("warehouse_location_id") as string) || undefined,
    notes: (formData.get("notes") as string) || undefined,
    client_id: (formData.get("client_id") as string) || undefined,
    packages: packagesRaw,
  };

  const parsed = createWarehouseReceiptSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(parsed.error.errors.map((e) => e.message).join(", "));
  }

  const input = parsed.data;

  // Duplicate check on first package tracking
  const firstPkg = input.packages[0]!;
  const duplicate = await checkDuplicateTracking(firstPkg.tracking_number);
  if (duplicate) {
    throw new Error(
      `Esta guía ya fue recibida el ${new Date(duplicate.received_at).toLocaleDateString("es")}. WR: ${duplicate.wr_number}`,
    );
  }

  // Calculate weights per package
  const dimensionalFactor = 166; // TODO: resolve from settings
  const packageInserts = input.packages.map((pkg) => {
    let volumetricWeightLb: number | null = null;
    if (pkg.length_in && pkg.width_in && pkg.height_in) {
      volumetricWeightLb = calculateVolumetricWeight(
        pkg.length_in,
        pkg.width_in,
        pkg.height_in,
        dimensionalFactor,
      );
    }
    const billableWeightLb = calculateBillableWeight(
      pkg.actual_weight_lb ?? null,
      volumetricWeightLb,
    );
    return { ...pkg, volumetric_weight_lb: volumetricWeightLb, billable_weight_lb: billableWeightLb };
  });

  // Generate WR number
  const wrNumber = await generateWrNumber();

  // Get org ID from user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    throw new Error("Perfil no encontrado");
  }

  // Insert WR (without package-level fields — trigger computes aggregates)
  const { data: wr, error } = await supabase
    .from("warehouse_receipts")
    .insert({
      organization_id: profile.organization_id,
      warehouse_id: input.warehouse_id,
      wr_number: wrNumber,
      status: "received",
      agency_id: input.agency_id ?? null,
      is_unknown: !input.agency_id,
      consignee_id: input.consignee_id ?? null,
      warehouse_location_id: input.warehouse_location_id ?? null,
      notes: input.notes ?? null,
      received_by: user.id,
      client_id: input.client_id ?? null,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  // Insert packages (trigger will update WR aggregates)
  const { error: pkgError } = await supabase.from("packages").insert(
    packageInserts.map((pkg) => ({
      organization_id: profile.organization_id,
      warehouse_receipt_id: wr.id,
      tracking_number: pkg.tracking_number,
      carrier: pkg.carrier,
      actual_weight_lb: pkg.actual_weight_lb ?? null,
      length_in: pkg.length_in ?? null,
      width_in: pkg.width_in ?? null,
      height_in: pkg.height_in ?? null,
      volumetric_weight_lb: pkg.volumetric_weight_lb,
      billable_weight_lb: pkg.billable_weight_lb,
      content_description: pkg.content_description ?? null,
      declared_value_usd: pkg.declared_value_usd ?? null,
      is_dgr: pkg.is_dgr,
      dgr_class: pkg.dgr_class ?? null,
      is_damaged: pkg.is_damaged,
      damage_description: pkg.damage_description ?? null,
      sender_name: pkg.sender_name ?? null,
      pieces_count: pkg.pieces_count,
    })),
  );

  if (pkgError) {
    throw new Error(pkgError.message);
  }

  // Insert initial status history
  await supabase.from("wr_status_history").insert({
    organization_id: profile.organization_id,
    warehouse_receipt_id: wr.id,
    new_status: "received",
    changed_by: user.id,
  });

  // Create unknown_wrs record if no agency was selected
  if (!input.agency_id) {
    await supabase.from("unknown_wrs").insert({
      organization_id: profile.organization_id,
      warehouse_receipt_id: wr.id,
      status: "unclaimed",
    });
  }

  // Save photo records
  const photosJson = formData.get("photos") as string | null;
  if (photosJson) {
    try {
      const photoRecords = JSON.parse(photosJson) as Array<{
        storage_path: string;
        file_name: string;
        is_damage_photo: boolean;
      }>;
      if (photoRecords.length) {
        await supabase.from("wr_photos").insert(
          photoRecords.map((p) => ({
            organization_id: profile.organization_id,
            warehouse_receipt_id: wr.id,
            storage_path: p.storage_path,
            file_name: p.file_name,
            is_damage_photo: p.is_damage_photo,
          })),
        );
      }
    } catch {
      // Photo save failure shouldn't block WR creation
      console.error("Failed to save photo records");
    }
  }

  // Send email notification to agency (non-blocking)
  try {
    if (!input.agency_id) throw new Error("skip");
    const { sendWrReceiptNotification } = await import("@/lib/email/wr-notifications");
    const { data: agencyData } = await supabase
      .from("agencies")
      .select("name, agency_contacts(email, contact_type)")
      .eq("id", input.agency_id)
      .single();

    if (agencyData) {
      const adminContact = agencyData.agency_contacts?.find(
        (c: { email: string | null; contact_type: string }) => c.contact_type === "admin" && c.email,
      );
      const anyEmailContact = agencyData.agency_contacts?.find(
        (c: { email: string | null }) => c.email,
      );
      const contactEmail = adminContact?.email ?? anyEmailContact?.email;

      if (contactEmail) {
        const { data: consignee } = input.consignee_id
          ? await supabase.from("consignees").select("full_name").eq("id", input.consignee_id).single()
          : { data: null };

        const totalBillable = packageInserts.reduce((sum, p) => sum + p.billable_weight_lb, 0);

        await sendWrReceiptNotification({
          agencyEmail: contactEmail,
          agencyName: agencyData.name,
          trackingNumber: firstPkg.tracking_number,
          wrNumber,
          consigneeName: consignee?.full_name ?? null,
          weightLb: totalBillable,
          isDamaged: packageInserts.some((p) => p.is_damaged),
          damageDescription: packageInserts.find((p) => p.is_damaged)?.damage_description ?? null,
        });
      }
    }
  } catch {
    // Email failure shouldn't block WR creation
    console.error("Failed to send WR receipt email");
  }

  revalidatePath("/warehouse-receipts");
  revalidatePath("/inventory");
  if (!input.agency_id) {
    revalidatePath("/unknown-wrs");
  }

  return { id: wr.id, wr_number: wrNumber };
}

export async function getPackages(filters?: {
  warehouse_id?: string;
  status?: string;
  agency_id?: string;
  search?: string;
  carrier?: string;
  is_damaged?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}) {
  const supabase = await createClient();

  const [warehouseScope, agencyScope] = await Promise.all([
    getUserWarehouseScope(),
    getUserAgencyScope(),
  ]);

  let query = supabase
    .from("packages")
    .select(
      "*, warehouse_receipts!inner(id, wr_number, status, received_at, agency_id, warehouse_id, consignee_id, agencies(name, code), consignees(full_name, casillero))",
      { count: "exact" },
    )
    .order("created_at", { ascending: false });

  // Apply warehouse scope
  if (warehouseScope !== null && warehouseScope.length > 0) {
    query = query.in("warehouse_receipts.warehouse_id", warehouseScope);
  } else if (warehouseScope !== null && warehouseScope.length === 0) {
    return { data: [], count: 0 };
  }

  // Apply agency scope
  if (agencyScope !== null && agencyScope.length > 0) {
    query = query.in("warehouse_receipts.agency_id", agencyScope);
  } else if (agencyScope !== null && agencyScope.length === 0) {
    return { data: [], count: 0 };
  }

  if (filters?.warehouse_id) {
    query = query.eq("warehouse_receipts.warehouse_id", filters.warehouse_id);
  }

  if (filters?.status) {
    query = query.eq("warehouse_receipts.status", filters.status);
  }

  if (filters?.agency_id) {
    query = query.eq("warehouse_receipts.agency_id", filters.agency_id);
  }

  if (filters?.is_damaged === "true") {
    query = query.eq("is_damaged", true);
  }

  if (filters?.carrier) {
    query = query.eq("carrier", filters.carrier);
  }

  if (filters?.date_from) {
    query = query.gte("warehouse_receipts.received_at", filters.date_from);
  }

  if (filters?.date_to) {
    query = query.lte("warehouse_receipts.received_at", `${filters.date_to}T23:59:59`);
  }

  if (filters?.search) {
    query = query.or(
      `tracking_number.ilike.%${filters.search}%,sender_name.ilike.%${filters.search}%,content_description.ilike.%${filters.search}%`,
    );
  }

  const limit = filters?.limit ?? 50;
  const offset = filters?.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    return { data: null, count: 0 };
  }

  return { data, count: count ?? 0 };
}

export async function getWarehouseReceipts(filters?: {
  warehouse_id?: string;
  status?: string;
  agency_id?: string;
  search?: string;
  carrier?: string;
  is_damaged?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}) {
  const supabase = await createClient();

  const [warehouseScope, agencyScope] = await Promise.all([
    getUserWarehouseScope(),
    getUserAgencyScope(),
  ]);

  let query = supabase
    .from("warehouse_receipts")
    .select("*, agencies(name, code, type), consignees(full_name, casillero), packages(*)", { count: "exact" })
    .order("received_at", { ascending: false });

  // Apply warehouse scope for warehouse-scoped users
  if (warehouseScope !== null && warehouseScope.length > 0) {
    query = query.in("warehouse_id", warehouseScope);
  } else if (warehouseScope !== null && warehouseScope.length === 0) {
    return { data: [], error: null, count: 0 };
  }

  // Apply agency scope for agency users
  if (agencyScope !== null && agencyScope.length > 0) {
    query = query.in("agency_id", agencyScope);
  } else if (agencyScope !== null && agencyScope.length === 0) {
    return { data: [], error: null, count: 0 };
  }

  if (filters?.warehouse_id) {
    query = query.eq("warehouse_id", filters.warehouse_id);
  }

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  if (filters?.agency_id) {
    query = query.eq("agency_id", filters.agency_id);
  }

  if (filters?.is_damaged === "true") {
    query = query.eq("has_damaged_package", true);
  }

  if (filters?.date_from) {
    query = query.gte("received_at", filters.date_from);
  }

  if (filters?.date_to) {
    query = query.lte("received_at", `${filters.date_to}T23:59:59`);
  }

  if (filters?.search) {
    query = query.or(
      `wr_number.ilike.%${filters.search}%,notes.ilike.%${filters.search}%`,
    );
  }

  const limit = filters?.limit ?? 50;
  const offset = filters?.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    return { data: null, error: error.message, count: 0 };
  }

  // If searching by tracking/carrier/sender, filter via packages client-side
  // since these fields are now on the packages table
  if (filters?.search && data) {
    const search = filters.search.toLowerCase();
    const filtered = data.filter((wr: Record<string, unknown>) => {
      const wrNumber = (wr.wr_number as string) || "";
      const notes = (wr.notes as string) || "";
      if (wrNumber.toLowerCase().includes(search) || notes.toLowerCase().includes(search)) return true;
      const pkgs = wr.packages as Array<Record<string, unknown>> | null;
      return pkgs?.some((p) => {
        const tn = (p.tracking_number as string) || "";
        const carrier = (p.carrier as string) || "";
        const sender = (p.sender_name as string) || "";
        return tn.toLowerCase().includes(search) || carrier.toLowerCase().includes(search) || sender.toLowerCase().includes(search);
      });
    });
    return { data: filtered, error: null, count: filtered.length };
  }

  return { data, error: null, count: count ?? 0 };
}

export async function extendFreeStorage(
  wrId: string,
  days: number,
  reason: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { error } = await supabase
    .from("warehouse_receipts")
    .update({
      free_storage_override_days: days,
      free_storage_override_reason: reason,
    })
    .eq("id", wrId);

  if (error) return { error: error.message };

  revalidatePath("/inventory");
  return {};
}

export async function processAutoAbandon(): Promise<{ count: number; error?: string }> {
  const supabase = await createClient();

  // Default auto-abandon threshold: 90 days
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() - 90);

  // Find WRs past threshold that are still active (not dispatched/abandoned)
  const { data: wrs, error } = await supabase
    .from("warehouse_receipts")
    .select("id, organization_id, free_storage_override_days, received_at")
    .in("status", ["received", "in_warehouse"])
    .lt("received_at", thresholdDate.toISOString());

  if (error) return { count: 0, error: error.message };

  const toAbandon = (wrs ?? []).filter((wr) => {
    if (wr.free_storage_override_days) {
      const overrideDate = new Date(wr.received_at);
      overrideDate.setDate(overrideDate.getDate() + wr.free_storage_override_days);
      return new Date() > overrideDate;
    }
    return true;
  });

  if (!toAbandon.length) return { count: 0 };

  const ids = toAbandon.map((wr) => wr.id);

  await supabase
    .from("warehouse_receipts")
    .update({ status: "abandoned" })
    .in("id", ids);

  revalidatePath("/inventory");
  return { count: ids.length };
}

export async function getAgenciesForFilter() {
  const supabase = await createClient();
  const agencyScope = await getUserAgencyScope();

  if (agencyScope !== null && agencyScope.length === 0) {
    return [];
  }

  let query = supabase
    .from("agencies")
    .select("id, name, code")
    .eq("is_active", true)
    .order("name");

  if (agencyScope !== null) {
    query = query.in("id", agencyScope);
  }

  const { data } = await query;
  return data ?? [];
}

export async function getWarehousesForFilter() {
  const supabase = await createClient();
  const warehouseScope = await getUserWarehouseScope();

  let query = supabase
    .from("warehouses")
    .select("id, name, code")
    .eq("is_active", true)
    .order("name");

  if (warehouseScope !== null && warehouseScope.length > 0) {
    query = query.in("id", warehouseScope);
  } else if (warehouseScope !== null && warehouseScope.length === 0) {
    return [];
  }

  const { data } = await query;
  return data ?? [];
}

export async function getWarehouseReceipt(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("warehouse_receipts")
    .select(
      "*, agencies(name, code, type), consignees(full_name), packages(*), wr_photos(*), wr_status_history(*, profiles:changed_by(full_name)), wr_notes(*, profiles:created_by(full_name))",
    )
    .eq("id", id)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function updateWarehouseReceiptStatus(
  id: string,
  newStatus: string,
  reason?: string,
): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("No autenticado");
  }

  // Get current status
  const { data: current } = await supabase
    .from("warehouse_receipts")
    .select("status, organization_id")
    .eq("id", id)
    .single();

  if (!current) {
    throw new Error("WR no encontrado");
  }

  // Update status
  const { error } = await supabase
    .from("warehouse_receipts")
    .update({ status: newStatus })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  // Log status change
  await supabase.from("wr_status_history").insert({
    organization_id: current.organization_id,
    warehouse_receipt_id: id,
    old_status: current.status,
    new_status: newStatus,
    changed_by: user.id,
    reason: reason ?? null,
  });

  revalidatePath("/warehouse-receipts");
  revalidatePath("/inventory");
}

export async function bulkUpdateStatus(
  ids: string[],
  newStatus: string,
): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("No autenticado");
  }

  const { error } = await supabase
    .from("warehouse_receipts")
    .update({ status: newStatus })
    .in("id", ids);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/warehouse-receipts");
  revalidatePath("/inventory");
}

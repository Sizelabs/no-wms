"use server";

import {
  calculateBillableWeight,
  calculateVolumetricWeight,
  createWarehouseReceiptSchema,
} from "@no-wms/shared/validators/warehouse-receipt";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getUserAgencyScope, getUserWarehouseScope } from "@/lib/auth/scope";
import { formatDate } from "@/lib/format";
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

export async function generateWrNumber(warehouseId: string): Promise<string> {
  const supabase = await createClient();

  // Look up warehouse code and org
  const { data: warehouse } = await supabase
    .from("warehouses")
    .select("code, organization_id")
    .eq("id", warehouseId)
    .single();

  if (!warehouse?.code) {
    throw new Error("Bodega no encontrada");
  }

  const code = warehouse.code;

  // Query org-wide (uniqueness constraint is per org, not per warehouse)
  // Sort descending and take top candidates to find the true max sequence number,
  // avoiding Supabase's default 1000-row limit on large datasets.
  const { data: wrs } = await supabase
    .from("warehouse_receipts")
    .select("wr_number")
    .eq("organization_id", warehouse.organization_id)
    .like("wr_number", `${code}%`)
    .order("wr_number", { ascending: false })
    .limit(100);

  if (!wrs || wrs.length === 0) {
    return `${code}000001`;
  }

  // Find the highest numeric suffix across the top candidates
  let maxNum = 0;
  for (const wr of wrs) {
    const match = wr.wr_number.match(/(\d+)$/);
    if (match) {
      const num = parseInt(match[1]!, 10);
      if (num > maxNum) maxNum = num;
    }
  }

  return `${code}${String(maxNum + 1).padStart(6, "0")}`;
}

export async function generateWrNumberForWarehouse(warehouseId: string): Promise<string> {
  return generateWrNumber(warehouseId);
}

export async function checkWrNumberUnique(wrNumber: string, warehouseId?: string): Promise<boolean> {
  const supabase = await createClient();

  // Scope uniqueness check to the warehouse's organization
  let orgId: string | null = null;
  if (warehouseId) {
    const { data: wh } = await supabase
      .from("warehouses")
      .select("organization_id")
      .eq("id", warehouseId)
      .single();
    orgId = wh?.organization_id ?? null;
  }

  if (!orgId) {
    // Fallback: check from user profile
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();
      orgId = profile?.organization_id ?? null;
    }
  }

  let query = supabase
    .from("warehouse_receipts")
    .select("id", { count: "exact", head: true })
    .eq("wr_number", wrNumber);

  if (orgId) {
    query = query.eq("organization_id", orgId);
  }

  const { count } = await query;
  return (count ?? 0) === 0;
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
        package_type: (formData.get("package_type") as string) || undefined,
      },
    ];
  }

  const raw = {
    warehouse_id: formData.get("warehouse_id") as string,
    agency_id: (formData.get("agency_id") as string) || null,
    consignee_id: (formData.get("consignee_id") as string) || null,
    consignee_name: (formData.get("consignee_name") as string) || undefined,
    notes: (formData.get("notes") as string) || undefined,
    client_id: (formData.get("client_id") as string) || undefined,
    shipper_name: (formData.get("shipper_name") as string) || undefined,
    master_tracking: (formData.get("master_tracking") as string) || undefined,
    description: (formData.get("description") as string) || undefined,
    wr_number: (formData.get("wr_number") as string) || undefined,
    condition_flags: formData.get("condition_flags")
      ? JSON.parse(formData.get("condition_flags") as string)
      : [],
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
      `Esta guía ya fue recibida el ${formatDate(duplicate.received_at)}. WR: ${duplicate.wr_number}`,
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

  // Fetch warehouse info once (used for WR number generation and org fallback)
  const { data: warehouse } = await supabase
    .from("warehouses")
    .select("code, organization_id")
    .eq("id", input.warehouse_id)
    .single();

  if (!warehouse) {
    throw new Error("Bodega no encontrada");
  }

  // Get org ID from user profile, falling back to warehouse's org (superadmin case)
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    throw new Error("Perfil no encontrado");
  }

  const organizationId = (profile.organization_id as string | null) ?? warehouse.organization_id;

  if (!organizationId) {
    throw new Error("No se pudo determinar la organización");
  }

  // WR number: use provided or auto-generate
  let wrNumber: string;
  let wrNumberIsAutoGenerated: boolean;
  if (input.wr_number?.trim()) {
    wrNumber = input.wr_number.trim();
    wrNumberIsAutoGenerated = false;
    // Validate uniqueness within the organization
    const isUnique = await checkWrNumberUnique(wrNumber, input.warehouse_id);
    if (!isUnique) {
      // If the number looks auto-generated (matches warehouse code + digits pattern),
      // regenerate instead of throwing — handles race conditions between concurrent users
      if (new RegExp(`^${warehouse.code}\\d+$`).test(wrNumber)) {
        wrNumber = await generateWrNumber(input.warehouse_id);
        wrNumberIsAutoGenerated = true;
      } else {
        throw new Error(`El número de recibo "${wrNumber}" ya existe. Elija otro.`);
      }
    }
  } else {
    wrNumber = await generateWrNumber(input.warehouse_id);
    wrNumberIsAutoGenerated = true;
  }

  // Insert WR with retry on duplicate wr_number (handles race conditions)
  const MAX_WR_INSERT_RETRIES = 3;
  let wr: { id: string } | null = null;
  for (let attempt = 0; attempt < MAX_WR_INSERT_RETRIES; attempt++) {
    const { data, error } = await supabase
      .from("warehouse_receipts")
      .insert({
        organization_id: organizationId,
        warehouse_id: input.warehouse_id,
        wr_number: wrNumber,
        status: "received",
        agency_id: input.agency_id ?? null,
        is_unknown: !input.agency_id,
        consignee_id: input.consignee_id ?? null,
        consignee_name: input.consignee_name ?? null,
        notes: input.notes ?? null,
        shipper_name: input.shipper_name ?? null,
        master_tracking: input.master_tracking ?? null,
        description: input.description ?? null,
        condition_flags: input.condition_flags ?? [],
        received_by: user.id,
        client_id: input.client_id ?? null,
      })
      .select("id")
      .single();

    if (!error) {
      wr = data;
      break;
    }

    // 23505 = unique_violation — regenerate and retry if auto-generated
    if (error.code === "23505" && wrNumberIsAutoGenerated) {
      wrNumber = await generateWrNumber(input.warehouse_id);
      continue;
    }

    throw new Error(error.message);
  }

  if (!wr) {
    throw new Error("No se pudo generar un número de recibo único. Intente de nuevo.");
  }

  // Insert packages (trigger will update WR aggregates)
  const { data: insertedPkgs, error: pkgError } = await supabase.from("packages").insert(
    packageInserts.map((pkg) => ({
      organization_id: organizationId,
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
      notes: pkg.notes ?? null,
      sender_name: pkg.sender_name ?? null,
      pieces_count: pkg.pieces_count,
      package_type: pkg.package_type ?? null,
      condition_flags: pkg.condition_flags ?? ["sin_novedad"],
      warehouse_location_id: pkg.warehouse_location_id ?? null,
    })),
  ).select("id");

  if (pkgError) {
    throw new Error(pkgError.message);
  }

  const packageIds = (insertedPkgs ?? []).map((p) => p.id);

  // Insert initial status history
  await supabase.from("wr_status_history").insert({
    organization_id: organizationId,
    warehouse_receipt_id: wr.id,
    new_status: "received",
    changed_by: user.id,
  });

  // Create unknown_wrs record if no agency was selected
  if (!input.agency_id) {
    await supabase.from("unknown_wrs").insert({
      organization_id: organizationId,
      warehouse_receipt_id: wr.id,
      status: "unclaimed",
    });
  }

  // Save photo records (linked to their respective packages)
  const photosJson = formData.get("photos") as string | null;
  if (photosJson) {
    try {
      const photoRecords = JSON.parse(photosJson) as Array<{
        storage_path: string;
        file_name: string;
        is_damage_photo: boolean;
        package_index?: number;
      }>;
      if (photoRecords.length) {
        await supabase.from("wr_photos").insert(
          photoRecords.map((p) => ({
            organization_id: organizationId,
            warehouse_receipt_id: wr.id,
            package_id: p.package_index != null ? packageIds[p.package_index] ?? null : null,
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

  // Save attachment records
  const attachmentsJson = formData.get("attachments") as string | null;
  if (attachmentsJson) {
    try {
      const attachmentRecords = JSON.parse(attachmentsJson) as Array<{
        storage_path: string;
        file_name: string;
      }>;
      if (attachmentRecords.length) {
        await supabase.from("wr_attachments").insert(
          attachmentRecords.map((a) => ({
            organization_id: organizationId,
            warehouse_receipt_id: wr.id,
            storage_path: a.storage_path,
            file_name: a.file_name,
          })),
        );
      }
    } catch {
      console.error("Failed to save attachment records");
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
  revalidatePath("/history");
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
      "*, warehouse_receipts!inner(id, wr_number, status, received_at, agency_id, warehouse_id, consignee_id, consignee_name, agencies(name, code), consignees(full_name, casillero))",
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
    const statuses = filters.status.split(",");
    query = statuses.length === 1
      ? query.eq("warehouse_receipts.status", statuses[0]!)
      : query.in("warehouse_receipts.status", statuses);
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

  const limit = filters?.limit ?? 50;
  const offset = filters?.offset ?? 0;

  // When searching, use the DB function for efficient cross-table search
  if (filters?.search) {
    // Empty scope arrays mean user has no access
    if (warehouseScope !== null && warehouseScope.length === 0) return { data: [], error: null, count: 0 };
    if (agencyScope !== null && agencyScope.length === 0) return { data: [], error: null, count: 0 };

    const statuses = filters.status?.split(",").filter(Boolean);
    // Build scope arrays: explicit filter > user scope > null (no restriction)
    const warehouseIds = filters.warehouse_id ? [filters.warehouse_id] : warehouseScope;
    const agencyIds = filters.agency_id ? [filters.agency_id] : agencyScope;

    const { data: hits, error: rpcError } = await supabase.rpc("search_warehouse_receipts", {
      p_search: filters.search,
      p_status: statuses?.length ? statuses : null,
      p_agency_ids: agencyIds,
      p_warehouse_ids: warehouseIds,
      p_date_from: filters.date_from ?? null,
      p_date_to: filters.date_to ? `${filters.date_to}T23:59:59` : null,
      p_limit: limit,
      p_offset: offset,
    });

    if (rpcError) {
      return { data: null, error: rpcError.message, count: 0 };
    }

    const ids = (hits as Array<{ id: string; total_count: number }>)?.map((h) => h.id) ?? [];
    const totalCount = (hits as Array<{ id: string; total_count: number }>)?.[0]?.total_count ?? 0;

    if (ids.length === 0) {
      return { data: [], error: null, count: 0 };
    }

    // Fetch full WR data for matched IDs
    const { data, error } = await supabase
      .from("warehouse_receipts")
      .select("*, agencies(name, code, type), consignees(full_name, casillero), packages(*)")
      .in("id", ids)
      .order("received_at", { ascending: false });

    if (error) {
      return { data: null, error: error.message, count: 0 };
    }

    return { data, error: null, count: Number(totalCount) };
  }

  // Non-search path: standard filtered query
  let query = supabase
    .from("warehouse_receipts")
    .select("*, agencies(name, code, type), consignees(full_name, casillero), packages(*)", { count: "exact" })
    .order("received_at", { ascending: false });

  if (warehouseScope !== null && warehouseScope.length > 0) {
    query = query.in("warehouse_id", warehouseScope);
  } else if (warehouseScope !== null && warehouseScope.length === 0) {
    return { data: [], error: null, count: 0 };
  }

  if (agencyScope !== null && agencyScope.length > 0) {
    query = query.in("agency_id", agencyScope);
  } else if (agencyScope !== null && agencyScope.length === 0) {
    return { data: [], error: null, count: 0 };
  }

  if (filters?.warehouse_id) {
    query = query.eq("warehouse_id", filters.warehouse_id);
  }

  if (filters?.status) {
    const statuses = filters.status.split(",");
    query = statuses.length === 1
      ? query.eq("status", statuses[0]!)
      : query.in("status", statuses);
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

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    return { data: null, error: error.message, count: 0 };
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
      "*, agencies(name, code, type, couriers(name, code)), consignees(full_name, casillero), warehouses(name, code, city, country, full_address, phone, email), profiles:received_by(full_name), packages(*, warehouse_locations:warehouse_location_id(name, code, warehouse_zones:zone_id(name, code))), wr_photos(*), wr_attachments(*), wr_status_history(*, profiles:changed_by(full_name)), wr_notes(*, profiles:created_by(full_name))",
    )
    .eq("id", id)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  // Generate signed URLs for photos (bucket is private)
  if (data.wr_photos?.length) {
    const photoPaths = data.wr_photos.map((p: { storage_path: string }) => p.storage_path);
    const { data: signedPhotos } = await supabase.storage
      .from("wr-photos")
      .createSignedUrls(photoPaths, 60 * 60); // 1 hour

    if (signedPhotos) {
      for (let i = 0; i < data.wr_photos.length; i++) {
        (data.wr_photos[i] as Record<string, unknown>).signed_url =
          signedPhotos[i]?.signedUrl ?? null;
      }
    }
  }

  // Generate signed URLs for attachments (bucket is private)
  if (data.wr_attachments?.length) {
    const attachPaths = data.wr_attachments.map((a: { storage_path: string }) => a.storage_path);
    const { data: signedAttach } = await supabase.storage
      .from("wr-attachments")
      .createSignedUrls(attachPaths, 60 * 60);

    if (signedAttach) {
      for (let i = 0; i < data.wr_attachments.length; i++) {
        (data.wr_attachments[i] as Record<string, unknown>).signed_url =
          signedAttach[i]?.signedUrl ?? null;
      }
    }
  }

  return { data, error: null };
}

export async function getAgencyHomeDestination(agencyId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("agency_destinations")
    .select("destinations(city, country_code)")
    .eq("agency_id", agencyId)
    .eq("is_home", true)
    .maybeSingle();

  if (!data) return null;

  // Supabase may return destinations as array or object depending on FK
  const raw = data.destinations;
  const dest = Array.isArray(raw) ? raw[0] : raw;
  return dest ? { city: dest.city as string, country_code: dest.country_code as string } : null;
}

export async function getWarehouseReceiptForPrint(id: string) {
  const { data: wr, error } = await getWarehouseReceipt(id);
  if (error || !wr) return { data: null, settings: null, org: null };

  const supabase = await createClient();

  // Get org ID from user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .limit(1)
    .single();

  const orgId = profile?.organization_id;

  // Fetch legal settings and org info in parallel
  const settingKeys = [
    "wr_delivery_statement",
    "wr_lien_statement",
    "wr_liability_per_pound",
    "wr_ownership_statement",
    "wr_terms_url",
    "wr_storage_charges_text",
  ] as const;

  const [settingsResults, orgResult] = await Promise.all([
    Promise.all(
      settingKeys.map((key) =>
        orgId
          ? supabase.rpc("resolve_setting", { p_org_id: orgId, p_key: key }).then((r) => [key, r.data] as const)
          : Promise.resolve([key, null] as const),
      ),
    ),
    orgId
      ? supabase.from("organizations").select("name, logo_url, slug").eq("id", orgId).single()
      : Promise.resolve({ data: null }),
  ]);

  const settings = Object.fromEntries(
    settingsResults.map(([key, val]) => [key, val != null ? String(val).replace(/^"|"$/g, "") : ""]),
  );

  return { data: wr, settings, org: orgResult.data };
}

// ---------------------------------------------------------------------------
// Field-level update for editable document
// ---------------------------------------------------------------------------

const WR_EDITABLE_FIELDS = [
  "consignee_id",
  "consignee_name",
  "shipper_name",
  "master_tracking",
  "description",
  "notes",
  "condition_flags",
  "wr_number",
  "received_at",
  "received_by",
] as const;

type WrEditableField = (typeof WR_EDITABLE_FIELDS)[number];

export async function updateWarehouseReceiptField(
  id: string,
  field: WrEditableField,
  value: string,
): Promise<{ error?: string }> {
  if (!WR_EDITABLE_FIELDS.includes(field)) {
    return { error: "Campo no permitido" };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  let updateData: Record<string, unknown> = {};

  if (field === "condition_flags") {
    try {
      updateData.condition_flags = JSON.parse(value);
    } catch {
      return { error: "Formato de flags invalido" };
    }
  } else if (field === "consignee_id") {
    updateData.consignee_id = value || null;
    updateData.consignee_name = null;
  } else if (field === "consignee_name") {
    updateData.consignee_name = value || null;
    updateData.consignee_id = null;
  } else if (field === "wr_number") {
    const trimmed = value.trim();
    if (!trimmed) return { error: "El numero de WR no puede estar vacio" };
    // Check uniqueness within org
    const { data: wr } = await supabase
      .from("warehouse_receipts")
      .select("organization_id")
      .eq("id", id)
      .single();
    if (!wr) return { error: "WR no encontrado" };
    const { data: existing } = await supabase
      .from("warehouse_receipts")
      .select("id")
      .eq("organization_id", wr.organization_id)
      .eq("wr_number", trimmed)
      .neq("id", id)
      .limit(1);
    if (existing && existing.length > 0) {
      return { error: `El numero "${trimmed}" ya esta en uso` };
    }
    updateData.wr_number = trimmed;
  } else if (field === "received_at") {
    if (!value) return { error: "La fecha es requerida" };
    updateData.received_at = value;
  } else if (field === "received_by") {
    if (!value) return { error: "El receptor es requerido" };
    updateData.received_by = value;
  } else {
    updateData[field] = value || null;
  }

  const { error } = await supabase
    .from("warehouse_receipts")
    .update(updateData)
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/inventory");
  return {};
}

// ---------------------------------------------------------------------------
// Package field-level update
// ---------------------------------------------------------------------------

const PKG_EDITABLE_FIELDS = [
  "actual_weight_lb",
  "length_in",
  "width_in",
  "height_in",
  "pieces_count",
  "package_type",
  "declared_value_usd",
  "tracking_number",
  "carrier",
  "sender_name",
  "is_damaged",
  "damage_description",
  "is_dgr",
  "dgr_class",
  "warehouse_location_id",
] as const;

type PkgEditableField = (typeof PKG_EDITABLE_FIELDS)[number];

export async function updatePackageField(
  packageId: string,
  field: PkgEditableField,
  value: string,
): Promise<{ error?: string }> {
  if (!PKG_EDITABLE_FIELDS.includes(field)) {
    return { error: "Campo no permitido" };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  // Get current package data for weight recalculation
  const { data: pkg } = await supabase
    .from("packages")
    .select("actual_weight_lb, length_in, width_in, height_in")
    .eq("id", packageId)
    .single();

  if (!pkg) return { error: "Paquete no encontrado" };

  const numericFields = ["actual_weight_lb", "length_in", "width_in", "height_in", "pieces_count", "declared_value_usd"];
  const updateData: Record<string, unknown> = {};

  if (field === "tracking_number") {
    const trimmed = value.trim();
    if (!trimmed) return { error: "El tracking no puede estar vacio" };
    // Check uniqueness within org
    const { data: pkgWithOrg } = await supabase
      .from("packages")
      .select("organization_id")
      .eq("id", packageId)
      .single();
    if (!pkgWithOrg) return { error: "Paquete no encontrado" };
    const { data: existing } = await supabase
      .from("packages")
      .select("id")
      .eq("organization_id", pkgWithOrg.organization_id)
      .eq("tracking_number", trimmed)
      .neq("id", packageId)
      .limit(1);
    if (existing && existing.length > 0) {
      return { error: `El tracking "${trimmed}" ya esta en uso` };
    }
    updateData.tracking_number = trimmed;
  } else if (field === "carrier" || field === "sender_name" || field === "damage_description" || field === "dgr_class") {
    updateData[field] = value || null;
  } else if (field === "is_damaged" || field === "is_dgr") {
    updateData[field] = value === "true";
  } else if (numericFields.includes(field)) {
    updateData[field] = value ? Number(value) : null;
  } else {
    updateData[field] = value || null;
  }

  // Recalculate weights if a dimension/weight field changed
  const weightDimFields = ["actual_weight_lb", "length_in", "width_in", "height_in"];
  if (weightDimFields.includes(field)) {
    const merged = { ...pkg, ...updateData };
    const l = merged.length_in as number | null;
    const w = merged.width_in as number | null;
    const h = merged.height_in as number | null;
    const actualWeight = merged.actual_weight_lb as number | null;
    const dimensionalFactor = 166;

    let volumetricWeightLb: number | null = null;
    if (l && w && h) {
      volumetricWeightLb = calculateVolumetricWeight(l, w, h, dimensionalFactor);
    }
    const billableWeightLb = calculateBillableWeight(actualWeight, volumetricWeightLb);

    updateData.volumetric_weight_lb = volumetricWeightLb;
    updateData.billable_weight_lb = billableWeightLb;
  }

  const { error } = await supabase
    .from("packages")
    .update(updateData)
    .eq("id", packageId);

  if (error) return { error: error.message };

  revalidatePath("/inventory");
  return {};
}

// ---------------------------------------------------------------------------
// Add a new package to a warehouse receipt
// ---------------------------------------------------------------------------

export async function addPackageToWarehouseReceipt(
  warehouseReceiptId: string,
  trackingNumber: string,
  extraFields?: {
    carrier?: string;
    sender_name?: string;
    package_type?: string;
    actual_weight_lb?: number;
    pieces_count?: number;
    length_in?: number;
    width_in?: number;
    height_in?: number;
    declared_value_usd?: number;
    is_damaged?: boolean;
    damage_description?: string;
    is_dgr?: boolean;
    dgr_class?: string;
  },
): Promise<{ data?: { id: string; tracking_number: string }; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  // Get org from WR
  const { data: wr } = await supabase
    .from("warehouse_receipts")
    .select("organization_id")
    .eq("id", warehouseReceiptId)
    .single();
  if (!wr) return { error: "WR no encontrado" };

  const trimmed = trackingNumber.trim();
  if (!trimmed) return { error: "El tracking no puede estar vacio" };

  // Check uniqueness
  const { data: existing } = await supabase
    .from("packages")
    .select("id")
    .eq("organization_id", wr.organization_id)
    .eq("tracking_number", trimmed)
    .limit(1);
  if (existing && existing.length > 0) {
    return { error: `El tracking "${trimmed}" ya esta en uso` };
  }

  // Build insert data with optional extra fields
  const insertData: Record<string, unknown> = {
    organization_id: wr.organization_id,
    warehouse_receipt_id: warehouseReceiptId,
    tracking_number: trimmed,
    pieces_count: extraFields?.pieces_count ?? 1,
    condition_flags: ["sin_novedad"],
  };

  if (extraFields) {
    if (extraFields.carrier) insertData.carrier = extraFields.carrier;
    if (extraFields.sender_name) insertData.sender_name = extraFields.sender_name;
    if (extraFields.package_type) insertData.package_type = extraFields.package_type;
    if (extraFields.actual_weight_lb != null) insertData.actual_weight_lb = extraFields.actual_weight_lb;
    if (extraFields.length_in != null) insertData.length_in = extraFields.length_in;
    if (extraFields.width_in != null) insertData.width_in = extraFields.width_in;
    if (extraFields.height_in != null) insertData.height_in = extraFields.height_in;
    if (extraFields.declared_value_usd != null) insertData.declared_value_usd = extraFields.declared_value_usd;
    if (extraFields.is_damaged != null) insertData.is_damaged = extraFields.is_damaged;
    if (extraFields.damage_description) insertData.damage_description = extraFields.damage_description;
    if (extraFields.is_dgr != null) insertData.is_dgr = extraFields.is_dgr;
    if (extraFields.dgr_class) insertData.dgr_class = extraFields.dgr_class;

    // Calculate volumetric/billable weight if dimensions provided
    if (extraFields.length_in && extraFields.width_in && extraFields.height_in) {
      const vol = calculateVolumetricWeight(extraFields.length_in, extraFields.width_in, extraFields.height_in, 166);
      insertData.volumetric_weight_lb = vol;
      insertData.billable_weight_lb = calculateBillableWeight(extraFields.actual_weight_lb ?? null, vol);
    }
  }

  const { data: pkg, error } = await supabase
    .from("packages")
    .insert(insertData)
    .select("id, tracking_number")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/inventory");
  revalidatePath("/warehouse-receipts");
  return { data: pkg };
}

// ---------------------------------------------------------------------------
// Get warehouse locations for a warehouse
// ---------------------------------------------------------------------------

export async function getWarehouseLocationsForWarehouse(warehouseId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("warehouse_locations")
    .select("id, name, code, warehouse_zones:zone_id(name, code)")
    .eq("warehouse_id", warehouseId)
    .order("code");

  if (error) return [];

  return (data ?? []).map((loc) => {
    const zone = loc.warehouse_zones as { name: string; code: string } | { name: string; code: string }[] | null;
    const zoneName = zone ? (Array.isArray(zone) ? zone[0]?.name : zone.name) : null;
    return {
      id: loc.id,
      label: zoneName ? `${zoneName} / ${loc.code}` : loc.code,
    };
  });
}

export async function getOrgMembers() {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .limit(1)
    .single();
  if (!profile?.organization_id) return [];

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("organization_id", profile.organization_id)
    .order("full_name");

  return (data ?? []).map((p) => ({ id: p.id, name: p.full_name }));
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
  revalidatePath("/history");
}

export async function getStorageSettings(opts?: {
  agencyId?: string;
  warehouseId?: string;
}): Promise<{
  freeStorageDays: number;
  storageDailyRate: number;
}> {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .limit(1)
    .single();

  const orgId = profile?.organization_id;
  if (!orgId) return { freeStorageDays: 30, storageDailyRate: 0.5 };

  const rpcParams = {
    p_org_id: orgId,
    ...(opts?.agencyId ? { p_agency_id: opts.agencyId } : {}),
    ...(opts?.warehouseId ? { p_warehouse_id: opts.warehouseId } : {}),
  };

  const [{ data: freeDaysSetting }, { data: rateSetting }] = await Promise.all([
    supabase.rpc("resolve_setting", { ...rpcParams, p_key: "free_storage_days" }),
    supabase.rpc("resolve_setting", { ...rpcParams, p_key: "storage_daily_rate" }),
  ]);

  return {
    freeStorageDays: freeDaysSetting ? parseInt(String(freeDaysSetting), 10) : 30,
    storageDailyRate: rateSetting ? parseFloat(String(rateSetting)) : 0.5,
  };
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
  revalidatePath("/history");
}

export async function getWarehouseReceiptsForHistory(filters?: {
  warehouse_id?: string;
  status?: string;
  agency_id?: string;
  search?: string;
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

  const limit = filters?.limit ?? 50;
  const offset = filters?.offset ?? 0;

  // When searching, use the DB function for efficient cross-table search
  if (filters?.search) {
    if (warehouseScope !== null && warehouseScope.length === 0) return { data: [], error: null, count: 0 };
    if (agencyScope !== null && agencyScope.length === 0) return { data: [], error: null, count: 0 };

    const statuses = filters.status?.split(",").filter(Boolean);
    const warehouseIds = filters.warehouse_id ? [filters.warehouse_id] : warehouseScope;
    const agencyIds = filters.agency_id ? [filters.agency_id] : agencyScope;

    const { data: hits, error: rpcError } = await supabase.rpc("search_warehouse_receipts", {
      p_search: filters.search,
      p_status: statuses?.length ? statuses : null,
      p_agency_ids: agencyIds,
      p_warehouse_ids: warehouseIds,
      p_date_from: filters.date_from ?? null,
      p_date_to: filters.date_to ? `${filters.date_to}T23:59:59` : null,
      p_limit: limit,
      p_offset: offset,
    });

    if (rpcError) {
      return { data: null, error: rpcError.message, count: 0 };
    }

    const ids = (hits as Array<{ id: string; total_count: number }>)?.map((h) => h.id) ?? [];
    const totalCount = (hits as Array<{ id: string; total_count: number }>)?.[0]?.total_count ?? 0;

    if (ids.length === 0) {
      return { data: [], error: null, count: 0 };
    }

    const { data, error } = await supabase
      .from("warehouse_receipts")
      .select(
        "*, agencies(name, code, type), consignees(full_name, casillero), packages(*), wr_status_history(id, old_status, new_status, created_at, reason, profiles:changed_by(full_name))",
      )
      .in("id", ids)
      .order("received_at", { ascending: false });

    if (error) {
      return { data: null, error: error.message, count: 0 };
    }

    return { data, error: null, count: Number(totalCount) };
  }

  // Non-search path: standard filtered query
  let query = supabase
    .from("warehouse_receipts")
    .select(
      "*, agencies(name, code, type), consignees(full_name, casillero), packages(*), wr_status_history(id, old_status, new_status, created_at, reason, profiles:changed_by(full_name))",
      { count: "exact" },
    )
    .order("received_at", { ascending: false });

  if (warehouseScope !== null && warehouseScope.length > 0) {
    query = query.in("warehouse_id", warehouseScope);
  } else if (warehouseScope !== null && warehouseScope.length === 0) {
    return { data: [], error: null, count: 0 };
  }

  if (agencyScope !== null && agencyScope.length > 0) {
    query = query.in("agency_id", agencyScope);
  } else if (agencyScope !== null && agencyScope.length === 0) {
    return { data: [], error: null, count: 0 };
  }

  if (filters?.warehouse_id) {
    query = query.eq("warehouse_id", filters.warehouse_id);
  }

  if (filters?.status) {
    const statuses = filters.status.split(",");
    query = statuses.length === 1
      ? query.eq("status", statuses[0]!)
      : query.in("status", statuses);
  }

  if (filters?.agency_id) {
    query = query.eq("agency_id", filters.agency_id);
  }

  if (filters?.date_from) {
    query = query.gte("received_at", filters.date_from);
  }

  if (filters?.date_to) {
    query = query.lte("received_at", `${filters.date_to}T23:59:59`);
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    return { data: null, error: error.message, count: 0 };
  }

  return { data, error: null, count: count ?? 0 };
}

/**
 * Patch missing declared values on multiple WRs at once.
 * For each WR, distributes the total value evenly across its packages.
 */
export async function patchWrDeclaredValues(
  patches: Array<{ wrId: string; declaredValueUsd: number }>,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  for (const { wrId, declaredValueUsd } of patches) {
    const { data: packages } = await supabase
      .from("packages")
      .select("id")
      .eq("warehouse_receipt_id", wrId);

    if (!packages || packages.length === 0) continue;

    const perPackage = Math.round((declaredValueUsd / packages.length) * 100) / 100;
    const remainder = Math.round((declaredValueUsd - perPackage * packages.length) * 100) / 100;

    for (let i = 0; i < packages.length; i++) {
      const value = i === 0 ? perPackage + remainder : perPackage;
      await supabase
        .from("packages")
        .update({ declared_value_usd: value })
        .eq("id", packages[i]!.id);
    }

    await supabase
      .from("warehouse_receipts")
      .update({ total_declared_value_usd: declaredValueUsd })
      .eq("id", wrId);
  }

  revalidatePath("/warehouse-receipts");
  return {};
}

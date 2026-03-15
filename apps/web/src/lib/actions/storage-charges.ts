"use server";

import { revalidatePath } from "next/cache";

import { getUserAgencyScope } from "@/lib/auth/scope";
import { daysSinceDate, formatDateLocal } from "@/lib/date-utils";
import { createClient } from "@/lib/supabase/server";

type ChargeRow = {
  organization_id: string;
  warehouse_receipt_id: string;
  charge_date: string;
  daily_rate: number;
  amount: number;
};

const BATCH_SIZE = 500;

/**
 * Calculate and insert storage charges for all eligible WRs in the organization.
 * Idempotent: uses ON CONFLICT DO NOTHING for (warehouse_receipt_id, charge_date).
 * Backfills missed days between the last charge (or free-period end) and today.
 */
export async function calculateStorageCharges(orgId: string): Promise<{ inserted: number } | { error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autenticado" };

  // Get all WRs still in warehouse / work order / dispatch (not yet dispatched or abandoned)
  const { data: wrs, error: wrError } = await supabase
    .from("warehouse_receipts")
    .select("id, agency_id, warehouse_id, received_at, organization_id, free_storage_override_days")
    .eq("organization_id", orgId)
    .in("status", ["in_warehouse", "in_work_order", "in_dispatch"]);

  if (wrError) return { error: wrError.message };
  if (!wrs?.length) return { inserted: 0 };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Bulk-fetch last charge dates for all WRs in one query
  const wrIds = wrs.map((wr) => wr.id);
  const { data: allLastCharges } = await supabase
    .from("storage_charges")
    .select("warehouse_receipt_id, charge_date")
    .in("warehouse_receipt_id", wrIds)
    .order("charge_date", { ascending: false });

  // Build a map of WR ID → latest charge date (first occurrence per WR due to desc order)
  const lastChargeMap = new Map<string, string>();
  if (allLastCharges) {
    for (const row of allLastCharges) {
      if (!lastChargeMap.has(row.warehouse_receipt_id)) {
        lastChargeMap.set(row.warehouse_receipt_id, row.charge_date);
      }
    }
  }

  // Cache resolve_setting results by (agency_id, warehouse_id) composite key
  const settingsCache = new Map<string, { freeDays: number; dailyRate: number }>();

  async function resolveSettings(agencyId: string | null, warehouseId: string | null) {
    const cacheKey = `${agencyId ?? ""}:${warehouseId ?? ""}`;
    const cached = settingsCache.get(cacheKey);
    if (cached) return cached;

    const [{ data: freeDaysSetting }, { data: rateSetting }] = await Promise.all([
      supabase.rpc("resolve_setting", {
        p_org_id: orgId,
        p_key: "free_storage_days",
        ...(agencyId ? { p_agency_id: agencyId } : {}),
        ...(warehouseId ? { p_warehouse_id: warehouseId } : {}),
      }),
      supabase.rpc("resolve_setting", {
        p_org_id: orgId,
        p_key: "storage_daily_rate",
        ...(agencyId ? { p_agency_id: agencyId } : {}),
        ...(warehouseId ? { p_warehouse_id: warehouseId } : {}),
      }),
    ]);

    const result = {
      freeDays: freeDaysSetting ? parseInt(String(freeDaysSetting), 10) : 30,
      dailyRate: rateSetting ? parseFloat(String(rateSetting)) : 0.5,
    };
    settingsCache.set(cacheKey, result);
    return result;
  }

  let totalInserted = 0;
  let batch: ChargeRow[] = [];

  async function flushBatch() {
    if (!batch.length) return;
    const { error: insertError } = await supabase
      .from("storage_charges")
      .upsert(batch, { onConflict: "warehouse_receipt_id,charge_date", ignoreDuplicates: true });
    if (insertError) throw new Error(insertError.message);
    totalInserted += batch.length;
    batch = [];
  }

  try {
    for (const wr of wrs) {
      const { freeDays: resolvedFreeDays, dailyRate } = await resolveSettings(wr.agency_id, wr.warehouse_id);

      // Per-WR override takes precedence over resolved setting
      const freeDays = wr.free_storage_override_days ?? resolvedFreeDays;

      const daysSinceReceived = daysSinceDate(wr.received_at);
      if (daysSinceReceived <= freeDays) continue;

      // Determine the first chargeable date: received_at + freeDays + 1
      const receivedDate = new Date(wr.received_at);
      receivedDate.setHours(0, 0, 0, 0);
      const firstChargeableDate = new Date(receivedDate);
      firstChargeableDate.setDate(firstChargeableDate.getDate() + freeDays + 1);

      // Start from the day after the last charge, or the first chargeable date
      const lastChargeDate = lastChargeMap.get(wr.id);
      let startDate: Date;
      if (lastChargeDate) {
        startDate = new Date(lastChargeDate);
        startDate.setDate(startDate.getDate() + 1);
      } else {
        startDate = firstChargeableDate;
      }

      // Generate rows for each missed day up to and including today
      const cursor = new Date(startDate);
      while (cursor <= today) {
        batch.push({
          organization_id: wr.organization_id,
          warehouse_receipt_id: wr.id,
          charge_date: formatDateLocal(cursor),
          daily_rate: dailyRate,
          amount: dailyRate,
        });
        cursor.setDate(cursor.getDate() + 1);

        if (batch.length >= BATCH_SIZE) await flushBatch();
      }
    }

    // Flush remaining rows
    await flushBatch();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error desconocido" };
  }

  revalidatePath("/invoicing");
  return { inserted: totalInserted };
}

export async function getStorageCharges(wrId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("storage_charges")
    .select("*")
    .eq("warehouse_receipt_id", wrId)
    .order("charge_date", { ascending: false });

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function getStorageChargesSummary(agencyId: string, periodStart: string, periodEnd: string) {
  const supabase = await createClient();
  const agencyScope = await getUserAgencyScope();

  if (agencyScope !== null && agencyScope.length === 0) {
    return { data: [], error: null };
  }

  // Get storage charges for WRs belonging to this agency in the date range
  const { data, error } = await supabase
    .from("storage_charges")
    .select("*, warehouse_receipts!inner(wr_number, agency_id)")
    .eq("warehouse_receipts.agency_id", agencyId)
    .gte("charge_date", periodStart)
    .lte("charge_date", periodEnd)
    .is("invoice_line_item_id", null)
    .order("charge_date", { ascending: true });

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

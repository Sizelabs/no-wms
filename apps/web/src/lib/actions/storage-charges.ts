"use server";

import { revalidatePath } from "next/cache";

import { getUserAgencyScope } from "@/lib/auth/scope";
import { createClient } from "@/lib/supabase/server";

/**
 * Calculate and insert storage charges for all eligible WRs in the organization.
 * Idempotent: uses ON CONFLICT DO NOTHING for (warehouse_receipt_id, charge_date).
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
    .select("id, agency_id, received_at, organization_id")
    .eq("organization_id", orgId)
    .in("status", ["in_warehouse", "in_work_order", "in_dispatch"]);

  if (wrError) return { error: wrError.message };
  if (!wrs?.length) return { inserted: 0 };

  const today = new Date().toISOString().split("T")[0]!;
  const rows: Array<{
    organization_id: string;
    warehouse_receipt_id: string;
    charge_date: string;
    daily_rate: number;
    amount: number;
  }> = [];

  for (const wr of wrs) {
    // Resolve free_storage_days setting via RPC (cascading: agency → org → platform)
    const { data: freeDaysSetting } = await supabase.rpc("resolve_setting", {
      p_org_id: orgId,
      p_key: "free_storage_days",
      p_agency_id: wr.agency_id ?? undefined,
    });

    const freeDays = freeDaysSetting ? parseInt(String(freeDaysSetting), 10) : 30;

    // Resolve storage_daily_rate setting
    const { data: rateSetting } = await supabase.rpc("resolve_setting", {
      p_org_id: orgId,
      p_key: "storage_daily_rate",
      p_agency_id: wr.agency_id ?? undefined,
    });

    const dailyRate = rateSetting ? parseFloat(String(rateSetting)) : 0.5;

    const receivedDate = new Date(wr.received_at);
    const daysSinceReceived = Math.floor(
      (Date.now() - receivedDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysSinceReceived > freeDays) {
      rows.push({
        organization_id: wr.organization_id,
        warehouse_receipt_id: wr.id,
        charge_date: today,
        daily_rate: dailyRate,
        amount: dailyRate,
      });
    }
  }

  if (!rows.length) return { inserted: 0 };

  // Bulk insert with idempotency
  const { error: insertError } = await supabase
    .from("storage_charges")
    .upsert(rows, { onConflict: "warehouse_receipt_id,charge_date", ignoreDuplicates: true });

  if (insertError) return { error: insertError.message };

  revalidatePath("/invoicing");
  return { inserted: rows.length };
}

export async function getStorageCharges(wrId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("storage_charges")
    .select("id, charge_date, daily_rate, amount, invoice_line_item_id, created_at")
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

"use server";

import { getUserAgencyScope, getUserFullScope, getUserWarehouseScope } from "@/lib/auth/scope";
import { createClient } from "@/lib/supabase/server";
import { daysSinceDate } from "@/lib/date-utils";
import { getStorageSettings } from "@/lib/actions/warehouse-receipts";

// ---------------------------------------------------------------------------
// Dashboard stats (live counts)
// ---------------------------------------------------------------------------
export async function getDashboardStats() {
  const supabase = await createClient();
  const { warehouseIds: warehouseScope, agencyIds: agencyScope } = await getUserFullScope();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString();

  const withScopes = (query: any) => {
    let scopedQuery = query;
    if (warehouseScope !== null && warehouseScope.length) {
      scopedQuery = scopedQuery.in("warehouse_id", warehouseScope);
    }
    if (agencyScope !== null && agencyScope.length) {
      scopedQuery = scopedQuery.in("agency_id", agencyScope);
    }
    return scopedQuery;
  };

  // Boxes received today
  const receivedQuery = withScopes(
    supabase
    .from("warehouse_receipts")
    .select("id", { count: "exact", head: true })
    .gte("created_at", todayIso),
  );

  // Total in warehouse
  const inWarehouseQuery = withScopes(
    supabase
    .from("warehouse_receipts")
    .select("id", { count: "exact", head: true })
    .in("status", ["in_warehouse", "in_work_order", "in_dispatch"]),
  );

  // Pending work orders
  const woQuery = withScopes(
    supabase
    .from("work_orders")
    .select("id", { count: "exact", head: true })
    .in("status", ["requested", "approved", "in_progress"]),
  );

  // Pending dispatches (SIs awaiting action)
  let siQuery = supabase
    .from("shipping_instructions")
    .select("id", { count: "exact", head: true })
    .in("status", ["requested", "approved"]);
  if (agencyScope !== null && agencyScope.length) {
    siQuery = siQuery.in("agency_id", agencyScope);
  }

  // Open tickets
  let ticketQuery = supabase
    .from("tickets")
    .select("id", { count: "exact", head: true })
    .eq("status", "open");
  if (agencyScope !== null && agencyScope.length) {
    ticketQuery = ticketQuery.in("agency_id", agencyScope);
  }

  // Recent WRs (last 5)
  const recentWrQuery = withScopes(
    supabase
    .from("warehouse_receipts")
    .select("id, wr_number, status, created_at, agencies:agency_id(name), packages(tracking_number)")
    .order("created_at", { ascending: false })
    .limit(5),
  );

  // Run getStorageSettings in parallel with the non-dependent queries
  const [
    { freeStorageDays },
    { count: boxesReceivedToday },
    { count: totalInWarehouse },
    { count: pendingWorkOrders },
    { count: pendingDispatches },
    { count: openTickets },
    { data: recentWrs },
  ] = await Promise.all([
    getStorageSettings(),
    receivedQuery,
    inWarehouseQuery,
    woQuery,
    siQuery,
    ticketQuery,
    recentWrQuery,
  ]);

  // Storage alerts query depends on resolved freeStorageDays
  const freeStorageCutoff = new Date(today);
  freeStorageCutoff.setDate(freeStorageCutoff.getDate() - freeStorageDays);

  const { count: storageAlerts } = await withScopes(
    supabase
    .from("warehouse_receipts")
    .select("id", { count: "exact", head: true })
    .in("status", ["in_warehouse", "in_work_order", "in_dispatch"])
    .lte("received_at", freeStorageCutoff.toISOString()),
  );

  return {
    boxesReceivedToday: boxesReceivedToday ?? 0,
    totalInWarehouse: totalInWarehouse ?? 0,
    pendingWorkOrders: pendingWorkOrders ?? 0,
    pendingDispatches: pendingDispatches ?? 0,
    openTickets: openTickets ?? 0,
    storageAlerts: storageAlerts ?? 0,
    recentWrs: recentWrs ?? [],
  };
}

// ---------------------------------------------------------------------------
// Inventory report
// ---------------------------------------------------------------------------
export async function getInventoryReport(filters?: {
  agency_id?: string;
  warehouse_id?: string;
  date_from?: string;
  date_to?: string;
}) {
  const supabase = await createClient();
  const agencyScope = await getUserAgencyScope();
  const warehouseScope = await getUserWarehouseScope();

  let query = supabase
    .from("warehouse_receipts")
    .select(
      "id, wr_number, status, total_billable_weight_lb, total_pieces, created_at, agencies:agency_id(name, code), warehouses:warehouse_id(name)",
    )
    .order("created_at", { ascending: false });

  if (agencyScope !== null && agencyScope.length) query = query.in("agency_id", agencyScope);
  if (warehouseScope !== null && warehouseScope.length) query = query.in("warehouse_id", warehouseScope);
  if (filters?.agency_id) query = query.eq("agency_id", filters.agency_id);
  if (filters?.warehouse_id) query = query.eq("warehouse_id", filters.warehouse_id);
  if (filters?.date_from) query = query.gte("created_at", filters.date_from);
  if (filters?.date_to) query = query.lte("created_at", filters.date_to);

  const { data, error } = await query;

  if (error) return { data: [], summary: null, error: error.message };

  const rows = data ?? [];
  const summary = {
    totalWrs: rows.length,
    totalWeight: rows.reduce((sum, r) => sum + (Number(r.total_billable_weight_lb) || 0), 0),
    totalPieces: rows.reduce((sum, r) => sum + (Number(r.total_pieces) || 0), 0),
    byStatus: Object.entries(
      rows.reduce(
        (acc, r) => {
          acc[r.status] = (acc[r.status] ?? 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
    ),
  };

  return { data: rows, summary, error: null };
}

// ---------------------------------------------------------------------------
// Shipping report
// ---------------------------------------------------------------------------
export async function getShippingReport(filters?: {
  agency_id?: string;
  date_from?: string;
  date_to?: string;
}) {
  const supabase = await createClient();
  const agencyScope = await getUserAgencyScope();

  let query = supabase
    .from("shipping_instructions")
    .select(
      `id, si_number, status, modality, total_weight_lb, total_pieces, created_at,
       agencies:agency_id(name, code),
       destinations:destination_id(city, country_code)`,
    )
    .order("created_at", { ascending: false });

  if (agencyScope !== null && agencyScope.length) query = query.in("agency_id", agencyScope);
  if (filters?.agency_id) query = query.eq("agency_id", filters.agency_id);
  if (filters?.date_from) query = query.gte("created_at", filters.date_from);
  if (filters?.date_to) query = query.lte("created_at", filters.date_to);

  const { data, error } = await query;

  if (error) return { data: [], summary: null, error: error.message };

  const rows = data ?? [];
  const summary = {
    totalSIs: rows.length,
    totalWeight: rows.reduce((sum, r) => sum + (Number(r.total_weight_lb) || 0), 0),
    totalPieces: rows.reduce((sum, r) => sum + (Number(r.total_pieces) || 0), 0),
    byStatus: Object.entries(
      rows.reduce(
        (acc, r) => {
          acc[r.status] = (acc[r.status] ?? 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
    ),
  };

  return { data: rows, summary, error: null };
}

// ---------------------------------------------------------------------------
// Billing report
// ---------------------------------------------------------------------------
export async function getBillingReport(filters?: {
  agency_id?: string;
  date_from?: string;
  date_to?: string;
}) {
  const supabase = await createClient();
  const agencyScope = await getUserAgencyScope();

  let query = supabase
    .from("invoices")
    .select("id, invoice_number, status, subtotal, tax, total, due_date, paid_at, created_at, agencies:agency_id(name, code)")
    .order("created_at", { ascending: false });

  if (agencyScope !== null && agencyScope.length) query = query.in("agency_id", agencyScope);
  if (filters?.agency_id) query = query.eq("agency_id", filters.agency_id);
  if (filters?.date_from) query = query.gte("created_at", filters.date_from);
  if (filters?.date_to) query = query.lte("created_at", filters.date_to);

  const { data, error } = await query;

  if (error) return { data: [], summary: null, error: error.message };

  const rows = data ?? [];
  const summary = {
    totalInvoices: rows.length,
    totalBilled: rows.reduce((sum, r) => sum + (Number(r.total) || 0), 0),
    totalPaid: rows.filter((r) => r.status === "paid").reduce((sum, r) => sum + (Number(r.total) || 0), 0),
    outstanding: rows
      .filter((r) => r.status === "sent" || r.status === "overdue")
      .reduce((sum, r) => sum + (Number(r.total) || 0), 0),
    byStatus: Object.entries(
      rows.reduce(
        (acc, r) => {
          acc[r.status] = (acc[r.status] ?? 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
    ),
  };

  return { data: rows, summary, error: null };
}

// ---------------------------------------------------------------------------
// Storage report
// ---------------------------------------------------------------------------
export async function getStorageReport(filters?: {
  agency_id?: string;
  warehouse_id?: string;
}) {
  const supabase = await createClient();
  const agencyScope = await getUserAgencyScope();
  const warehouseScope = await getUserWarehouseScope();

  let query = supabase
    .from("warehouse_receipts")
    .select(
      "id, wr_number, status, received_at, total_billable_weight_lb, agencies:agency_id(name, code), warehouses:warehouse_id(name)",
    )
    .in("status", ["in_warehouse", "in_work_order", "in_dispatch"])
    .order("received_at", { ascending: true });

  if (agencyScope !== null && agencyScope.length) query = query.in("agency_id", agencyScope);
  if (warehouseScope !== null && warehouseScope.length) query = query.in("warehouse_id", warehouseScope);
  if (filters?.agency_id) query = query.eq("agency_id", filters.agency_id);
  if (filters?.warehouse_id) query = query.eq("warehouse_id", filters.warehouse_id);

  const { data, error } = await query;

  if (error) return { data: [], error: error.message };

  const rows = (data ?? []).map((wr) => ({
    ...wr,
    days_in_storage: daysSinceDate(wr.received_at),
  }));

  return { data: rows, error: null };
}

"use server";

import { getUserAgencyScope, getUserWarehouseScope } from "@/lib/auth/scope";
import { createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Dashboard stats (live counts)
// ---------------------------------------------------------------------------
export async function getDashboardStats() {
  const supabase = await createClient();
  const warehouseScope = await getUserWarehouseScope();
  const agencyScope = await getUserAgencyScope();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString();

  // Boxes received today
  let receivedQuery = supabase
    .from("warehouse_receipts")
    .select("*", { count: "exact", head: true })
    .gte("created_at", todayIso);
  if (warehouseScope !== null && warehouseScope.length) {
    receivedQuery = receivedQuery.in("warehouse_id", warehouseScope);
  }
  if (agencyScope !== null && agencyScope.length) {
    receivedQuery = receivedQuery.in("agency_id", agencyScope);
  }
  const { count: boxesReceivedToday } = await receivedQuery;

  // Total in warehouse
  let inWarehouseQuery = supabase
    .from("warehouse_receipts")
    .select("*", { count: "exact", head: true })
    .in("status", ["in_warehouse", "in_work_order", "in_dispatch"]);
  if (warehouseScope !== null && warehouseScope.length) {
    inWarehouseQuery = inWarehouseQuery.in("warehouse_id", warehouseScope);
  }
  if (agencyScope !== null && agencyScope.length) {
    inWarehouseQuery = inWarehouseQuery.in("agency_id", agencyScope);
  }
  const { count: totalInWarehouse } = await inWarehouseQuery;

  // Pending work orders
  let woQuery = supabase
    .from("work_orders")
    .select("*", { count: "exact", head: true })
    .in("status", ["requested", "approved", "in_progress"]);
  if (warehouseScope !== null && warehouseScope.length) {
    woQuery = woQuery.in("warehouse_id", warehouseScope);
  }
  if (agencyScope !== null && agencyScope.length) {
    woQuery = woQuery.in("agency_id", agencyScope);
  }
  const { count: pendingWorkOrders } = await woQuery;

  // Pending dispatches (SIs awaiting action)
  let siQuery = supabase
    .from("shipping_instructions")
    .select("*", { count: "exact", head: true })
    .in("status", ["requested", "approved"]);
  if (agencyScope !== null && agencyScope.length) {
    siQuery = siQuery.in("agency_id", agencyScope);
  }
  const { count: pendingDispatches } = await siQuery;

  // Open tickets
  let ticketQuery = supabase
    .from("tickets")
    .select("*", { count: "exact", head: true })
    .eq("status", "open");
  if (agencyScope !== null && agencyScope.length) {
    ticketQuery = ticketQuery.in("agency_id", agencyScope);
  }
  const { count: openTickets } = await ticketQuery;

  // Storage alerts (WRs in warehouse > 30 days — simplified check)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  let storageQuery = supabase
    .from("warehouse_receipts")
    .select("*", { count: "exact", head: true })
    .in("status", ["in_warehouse", "in_work_order", "in_dispatch"])
    .lte("received_at", thirtyDaysAgo.toISOString());
  if (warehouseScope !== null && warehouseScope.length) {
    storageQuery = storageQuery.in("warehouse_id", warehouseScope);
  }
  if (agencyScope !== null && agencyScope.length) {
    storageQuery = storageQuery.in("agency_id", agencyScope);
  }
  const { count: storageAlerts } = await storageQuery;

  // Recent WRs (last 5)
  let recentWrQuery = supabase
    .from("warehouse_receipts")
    .select("id, wr_number, status, created_at, agencies:agency_id(name), packages(tracking_number)")
    .order("created_at", { ascending: false })
    .limit(5);
  if (warehouseScope !== null && warehouseScope.length) {
    recentWrQuery = recentWrQuery.in("warehouse_id", warehouseScope);
  }
  if (agencyScope !== null && agencyScope.length) {
    recentWrQuery = recentWrQuery.in("agency_id", agencyScope);
  }
  const { data: recentWrs } = await recentWrQuery;

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

  const now = new Date();
  const rows = (data ?? []).map((wr) => {
    const receivedDate = new Date(wr.received_at);
    const daysInStorage = Math.floor((now.getTime() - receivedDate.getTime()) / (1000 * 60 * 60 * 24));
    return { ...wr, days_in_storage: daysInStorage };
  });

  return { data: rows, error: null };
}

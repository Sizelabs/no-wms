"use client";

import type { WrStatus } from "@no-wms/shared/constants/statuses";
import { WR_STATUS_LABELS } from "@no-wms/shared/constants/statuses";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React, { useCallback, useMemo, useState, useTransition } from "react";

import { usePermissions } from "@/components/auth/role-provider";
import { useNotification } from "@/components/layout/notification";
import { filterSelectClass } from "@/components/ui/form-section";
import { WrActionBar } from "@/components/warehouse/wr-action-bar";
import { bulkUpdateStatus } from "@/lib/actions/warehouse-receipts";

interface WrPackage {
  tracking_number: string;
  carrier: string;
  billable_weight_lb: number;
  is_damaged: boolean;
  sender_name: string;
  declared_value_usd: number | null;
  package_type: string | null;
}

interface WarehouseReceipt {
  id: string;
  wr_number: string;
  warehouse_id: string;
  agency_id: string | null;
  packages: WrPackage[];
  total_billable_weight_lb: number | null;
  total_declared_value_usd: number | null;
  has_damaged_package: boolean;
  has_dgr_package: boolean;
  total_packages: number;
  total_pieces: number;
  status: string;
  received_at: string;
  free_storage_override_days: number | null;
  agencies: { name: string; code: string; type: string } | null;
  consignees: { full_name: string; casillero: string | null } | null;
  consignee_name: string | null;
}

interface WrHistoryTableProps {
  data: WarehouseReceipt[];
  count: number;
  locale: string;
  agencies?: Array<{ id: string; name: string; code: string }>;
  warehouses?: Array<{ id: string; name: string; code: string }>;
  freeStorageDays: number;
  storageDailyRate: number;
}

const STATUS_COLORS: Record<string, string> = {
  received: "bg-blue-50 text-blue-700",
  in_warehouse: "bg-green-50 text-green-700",
  in_work_order: "bg-yellow-50 text-yellow-700",
  in_dispatch: "bg-purple-50 text-purple-700",
  dispatched: "bg-gray-100 text-gray-600",
  damaged: "bg-red-50 text-red-700",
  abandoned: "bg-gray-200 text-gray-500",
};

const LB_TO_KG = 0.453592;
const COL_COUNT = 12;

function computeBodegaje(
  wr: WarehouseReceipt,
  freeStorageDays: number,
  storageDailyRate: number,
): { label: string; className: string } {
  if (wr.status === "dispatched" || wr.status === "abandoned") {
    return { label: "—", className: "text-gray-400" };
  }

  const daysSinceReceived = Math.ceil(
    (Date.now() - new Date(wr.received_at).getTime()) / (1000 * 60 * 60 * 24),
  );
  const freeDays = wr.free_storage_override_days ?? freeStorageDays;
  const remaining = freeDays - daysSinceReceived;

  if (remaining >= 0) {
    return {
      label: `Gratis (${remaining}d)`,
      className: "text-green-700",
    };
  }

  const chargeableDays = Math.abs(remaining);
  const amount = (chargeableDays * storageDailyRate).toFixed(2);
  return {
    label: `${chargeableDays}d ($${amount})`,
    className: chargeableDays > 30 ? "text-red-700 font-medium" : "text-orange-600",
  };
}

function groupByConsignee(receipts: WarehouseReceipt[]) {
  const groups = new Map<string, WarehouseReceipt[]>();
  for (const wr of receipts) {
    const key = wr.consignees?.full_name ?? wr.consignee_name ?? "";
    const list = groups.get(key);
    if (list) {
      list.push(wr);
    } else {
      groups.set(key, [wr]);
    }
  }
  return [...groups.entries()].sort((a, b) => {
    if (!a[0]) return 1;
    if (!b[0]) return -1;
    return a[0].localeCompare(b[0]);
  });
}

export function WrHistoryTable({ data, count, locale, agencies = [], warehouses = [], freeStorageDays, storageDailyRate }: WrHistoryTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const permissions = usePermissions();
  const { notify } = useNotification();
  const [showFilters, setShowFilters] = useState(false);
  const [isPending, startTransition] = useTransition();

  const grouped = groupByConsignee(data);

  // Selection state — tracks WR IDs
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Compute selected WR objects for the action bar
  const selectedWrs = useMemo(
    () => data.filter((wr) => selected.has(wr.id)),
    [data, selected],
  );

  // Count WRs that have active work orders (status = in_work_order)
  const wrsWithActiveWo = useMemo(
    () => selectedWrs.filter((wr) => wr.status === "in_work_order").length,
    [selectedWrs],
  );

  // Derive a warehouse_id and agency_id from the first selected WR for work order creation
  const firstSelected = selectedWrs[0];
  const actionWarehouseId = firstSelected?.warehouse_id ?? "";
  const actionAgencyId = firstSelected?.agency_id ?? "";

  const canCreateWorkOrders = permissions?.work_orders.create === true;

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (selected.size === data.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(data.map((wr) => wr.id)));
    }
  }, [data, selected.size]);

  const toggleGroup = useCallback((receipts: WarehouseReceipt[]) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const groupIds = receipts.map((r) => r.id);
      const allSelected = groupIds.every((id) => next.has(id));
      if (allSelected) {
        for (const id of groupIds) next.delete(id);
      } else {
        for (const id of groupIds) next.add(id);
      }
      return next;
    });
  }, []);

  const handleBulkStatus = useCallback(
    (status: string) => {
      startTransition(async () => {
        try {
          await bulkUpdateStatus(Array.from(selected), status);
          notify(`${selected.size} recibo(s) actualizado(s)`, "success");
          setSelected(new Set());
        } catch {
          notify("Error al actualizar estado", "error");
        }
      });
    },
    [selected, notify],
  );

  // Collapse state
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggleCollapse = useCallback((key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("offset");
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  const activeFilterCount = ["status", "agency_id", "warehouse_id", "date_from", "date_to"]
    .filter((k) => searchParams.has(k)).length;

  return (
    <div className="space-y-3">
      {/* Search + primary filter row */}
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          defaultValue={searchParams.get("search") ?? ""}
          onChange={(e) => updateFilter("search", e.target.value)}
          placeholder="Buscar guía, WR#, remitente..."
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
        />
        <select
          defaultValue={searchParams.get("status") ?? ""}
          onChange={(e) => updateFilter("status", e.target.value)}
          className={filterSelectClass}
        >
          <option value="">Todos los estados</option>
          {Object.entries(WR_STATUS_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`rounded-md border px-3 py-2 text-sm ${
            activeFilterCount > 0
              ? "border-gray-900 bg-gray-900 text-white"
              : "border-gray-300 text-gray-700 hover:bg-gray-50"
          }`}
        >
          Filtros{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
        </button>
      </div>

      {/* Expanded filters */}
      {showFilters && (
        <div className="flex flex-wrap gap-2 rounded-md border bg-gray-50 p-3">
          <select
            defaultValue={searchParams.get("warehouse_id") ?? ""}
            onChange={(e) => updateFilter("warehouse_id", e.target.value)}
            className={filterSelectClass}
          >
            <option value="">Todas las bodegas</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.code})
              </option>
            ))}
          </select>
          <select
            defaultValue={searchParams.get("agency_id") ?? ""}
            onChange={(e) => updateFilter("agency_id", e.target.value)}
            className={filterSelectClass}
          >
            <option value="">Todas las agencias</option>
            {agencies.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.code})
              </option>
            ))}
          </select>
          <input
            type="date"
            defaultValue={searchParams.get("date_from") ?? ""}
            onChange={(e) => updateFilter("date_from", e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            title="Desde"
          />
          <input
            type="date"
            defaultValue={searchParams.get("date_to") ?? ""}
            onChange={(e) => updateFilter("date_to", e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            title="Hasta"
          />
          {activeFilterCount > 0 && (
            <button
              onClick={() => {
                const params = new URLSearchParams();
                const search = searchParams.get("search");
                if (search) params.set("search", search);
                router.push(`${pathname}?${params.toString()}`);
              }}
              className="text-xs text-red-600 hover:text-red-800"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      )}

      {/* Bulk status actions (warehouse staff) */}
      {selected.size > 0 && permissions?.warehouse_receipts.update && (
        <div className="flex items-center gap-2 rounded-md bg-gray-100 px-3 py-2 text-sm">
          <span className="font-medium">
            {selected.size} recibo(s) seleccionado(s)
          </span>
          <button
            type="button"
            onClick={() => handleBulkStatus("in_warehouse")}
            disabled={isPending}
            className="rounded border bg-white px-2 py-1 text-xs hover:bg-gray-50"
          >
            En bodega
          </button>
          <button
            type="button"
            onClick={() => handleBulkStatus("dispatched")}
            disabled={isPending}
            className="rounded border bg-white px-2 py-1 text-xs hover:bg-gray-50"
          >
            Despachado
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="ml-auto text-xs text-gray-500 hover:text-gray-700"
          >
            Deseleccionar
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-auto rounded-lg border bg-white max-h-[calc(100vh-220px)]">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 z-10 bg-white">
            <tr className="border-b text-xs font-medium uppercase tracking-wider text-gray-500">
              <th className="px-3 py-3">
                <input
                  type="checkbox"
                  checked={selected.size === data.length && data.length > 0}
                  onChange={toggleAll}
                  className="rounded border-gray-300"
                />
              </th>
              <th className="px-3 py-3">WR#</th>
              <th className="px-3 py-3">Bodegaje</th>
              <th className="px-3 py-3">Tracking</th>
              <th className="px-3 py-3">Piezas</th>
              <th className="px-3 py-3">Peso (lb)</th>
              <th className="px-3 py-3">Peso (Kg)</th>
              <th className="px-3 py-3">Tipo</th>
              <th className="px-3 py-3">Remitente</th>
              <th className="px-3 py-3">Transportista</th>
              <th className="px-3 py-3">Valor Decl.</th>
              <th className="px-3 py-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={COL_COUNT} className="px-3 py-8 text-center text-gray-400">
                  No se encontraron recibos.
                </td>
              </tr>
            ) : (
              grouped.map(([consignee, receipts]) => {
                const groupKey = consignee || "__none";
                const isCollapsed = collapsed.has(groupKey);
                const casillero = receipts[0]?.consignees?.casillero;
                const totalPieces = receipts.reduce((sum, r) => sum + r.total_pieces, 0);
                const totalWeightLb = receipts.reduce((sum, r) => sum + (Number(r.total_billable_weight_lb) || 0), 0);
                const totalWeightKg = totalWeightLb * LB_TO_KG;
                const groupIds = receipts.map((r) => r.id);
                const allGroupSelected = groupIds.every((id) => selected.has(id));
                const someGroupSelected = !allGroupSelected && groupIds.some((id) => selected.has(id));
                return (
                <React.Fragment key={groupKey}>
                  {/* Group header */}
                  <tr className="sticky top-[40px] z-[5] border-t-2 border-gray-200 bg-gray-50">
                    <td className="bg-gray-50 px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={allGroupSelected}
                        ref={(el) => { if (el) el.indeterminate = someGroupSelected; }}
                        onChange={() => toggleGroup(receipts)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td
                      colSpan={3}
                      className="bg-gray-50 px-3 py-2.5 cursor-pointer select-none"
                      onClick={() => toggleCollapse(groupKey)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-xs">{isCollapsed ? "▸" : "▾"}</span>
                        <span className="text-sm font-semibold text-gray-800">
                          {consignee || "Sin destinatario"}
                        </span>
                        {casillero && (
                          <span className="inline-flex rounded-full bg-gray-200 px-2 py-0.5 font-mono text-[11px] text-gray-600">
                            {casillero}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="bg-gray-50 px-3 py-2.5 text-center text-xs font-medium text-gray-500">
                      {totalPieces}
                    </td>
                    <td className="bg-gray-50 px-3 py-2.5 font-mono text-xs font-medium text-gray-500">
                      {totalWeightLb.toFixed(1)}
                    </td>
                    <td className="bg-gray-50 px-3 py-2.5 font-mono text-xs font-medium text-gray-500">
                      {totalWeightKg.toFixed(1)}
                    </td>
                    <td colSpan={4} className="bg-gray-50" />
                    <td className="bg-gray-50 px-3 py-2.5 text-right text-xs text-gray-400">
                      {receipts.length} {receipts.length === 1 ? "recibo" : "recibos"}
                    </td>
                  </tr>
                  {/* Group rows */}
                  {!isCollapsed && receipts.map((wr) => {
                    const bodegaje = computeBodegaje(wr, freeStorageDays, storageDailyRate);
                    const weightLb = wr.total_billable_weight_lb;
                    const weightKg = weightLb != null ? (weightLb * LB_TO_KG).toFixed(1) : "—";
                    return (
                    <tr key={wr.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-3 py-2.5">
                        <input
                          type="checkbox"
                          checked={selected.has(wr.id)}
                          onChange={() => toggleSelect(wr.id)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <Link
                          href={`/${locale}/inventory/${wr.id}`}
                          className="font-mono text-xs font-medium text-gray-900 hover:underline"
                        >
                          {wr.wr_number}
                        </Link>
                        {wr.has_damaged_package && (
                          <span className="ml-1 inline-flex rounded bg-red-100 px-1 text-[10px] text-red-700">Daño</span>
                        )}
                        {wr.has_dgr_package && (
                          <span className="ml-1 inline-flex rounded bg-orange-100 px-1 text-[10px] text-orange-700">DGR</span>
                        )}
                      </td>
                      <td className={`px-3 py-2.5 text-xs ${bodegaje.className}`}>
                        {bodegaje.label}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs text-gray-600">
                        {wr.packages[0]?.tracking_number ?? "—"}
                        {wr.total_packages > 1 && (
                          <span className="ml-1 text-gray-400">(+{wr.total_packages - 1})</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center text-xs">
                        {wr.total_pieces}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs">
                        {weightLb?.toFixed(1) ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs">
                        {weightKg}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-600">
                        {wr.packages[0]?.package_type ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-600 truncate max-w-[120px]">
                        {wr.packages[0]?.sender_name ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-600">
                        {wr.packages.length === 0
                          ? "—"
                          : new Set(wr.packages.map((p) => p.carrier)).size > 1
                            ? "Multiple"
                            : wr.packages[0]?.carrier ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs text-gray-600">
                        {wr.total_declared_value_usd != null
                          ? `$${Number(wr.total_declared_value_usd).toFixed(2)}`
                          : "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            STATUS_COLORS[wr.status] ?? "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {WR_STATUS_LABELS[wr.status as WrStatus] ?? wr.status}
                        </span>
                      </td>
                    </tr>
                    );
                  })}
                </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{count} recibo(s) en total</span>
        <div className="flex gap-2">
          {(searchParams.get("offset") ? parseInt(searchParams.get("offset")!, 10) : 0) > 0 && (
            <button
              onClick={() => {
                const current = parseInt(searchParams.get("offset") ?? "0", 10);
                updateFilter("offset", String(Math.max(0, current - 50)));
              }}
              className="rounded border px-2 py-1 hover:bg-gray-50"
            >
              Anterior
            </button>
          )}
          {count > (parseInt(searchParams.get("offset") ?? "0", 10) + 50) && (
            <button
              onClick={() => {
                const current = parseInt(searchParams.get("offset") ?? "0", 10);
                updateFilter("offset", String(current + 50));
              }}
              className="rounded border px-2 py-1 hover:bg-gray-50"
            >
              Siguiente
            </button>
          )}
        </div>
      </div>

      {/* Bottom padding when action bar is visible */}
      {selected.size > 0 && canCreateWorkOrders && <div className="h-16" />}

      {/* Floating action bar for service requests */}
      {canCreateWorkOrders && actionWarehouseId && actionAgencyId && (
        <WrActionBar
          selectedWrs={selectedWrs}
          warehouseId={actionWarehouseId}
          agencyId={actionAgencyId}
          onClearSelection={() => setSelected(new Set())}
          wrsWithActiveWo={wrsWithActiveWo}
        />
      )}
    </div>
  );
}

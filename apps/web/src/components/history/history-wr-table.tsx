"use client";

import type { WrStatus } from "@no-wms/shared/constants/statuses";
import { WR_STATUS_LABELS } from "@no-wms/shared/constants/statuses";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React, { useCallback, useState, useTransition } from "react";

import { MultiSelectFilter } from "@/components/ui/multi-select-filter";

interface WrPackage {
  tracking_number: string;
  carrier: string;
  billable_weight_lb: number;
  sender_name: string;
  declared_value_usd: number | null;
}

interface StatusHistoryEntry {
  id: string;
  old_status: string | null;
  new_status: string;
  created_at: string;
  reason: string | null;
  profiles: { full_name: string } | null;
}

interface WarehouseReceipt {
  id: string;
  wr_number: string;
  total_billable_weight_lb: number | null;
  total_declared_value_usd: number | null;
  total_packages: number;
  total_pieces: number;
  status: string;
  received_at: string;
  has_damaged_package: boolean;
  has_dgr_package: boolean;
  agencies: { name: string; code: string; type: string } | null;
  consignees: { full_name: string; casillero: string | null } | null;
  consignee_name: string | null;
  packages: WrPackage[];
  wr_status_history: StatusHistoryEntry[];
}

interface HistoryWrTableProps {
  data: unknown[];
  count: number;
  locale: string;
  agencies?: Array<{ id: string; name: string; code: string }>;
  warehouses?: Array<{ id: string; name: string; code: string }>;
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

const COL_COUNT = 10;

function getLastChange(history: StatusHistoryEntry[]): string | null {
  if (!history.length) return null;
  const sorted = [...history].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  return sorted[0]?.created_at ?? null;
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

export function HistoryWrTable({ data, count, locale, agencies = [], warehouses = [] }: HistoryWrTableProps) {
  const typedData = data as WarehouseReceipt[];
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);

  const grouped = groupByConsignee(typedData);

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggleCollapse = useCallback((key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  const [isFiltering, startFiltering] = useTransition();

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("offset");
      startFiltering(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
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
        <MultiSelectFilter
          label="Todos los estados"
          options={Object.entries(WR_STATUS_LABELS).map(([k, v]) => ({ value: k, label: v }))}
          selected={searchParams.get("status")?.split(",").filter(Boolean) ?? []}
          onChange={(v) => updateFilter("status", v.join(","))}
        />
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`rounded-md border px-3 py-2 text-sm ${
            activeFilterCount > 0
              ? "border-gray-900 bg-gray-900 text-white"
              : "border-gray-300 text-gray-700 hover:bg-gray-50"
          }`}
        >
          Filtros<span className={`transition-opacity ${activeFilterCount > 0 ? "opacity-100" : "opacity-0"}`}>{` (${Math.max(activeFilterCount, 1)})`}</span>
        </button>
      </div>

      {/* Expanded filters */}
      {showFilters && (
        <div className="flex flex-wrap gap-2 rounded-md border bg-gray-50 p-3">
          <MultiSelectFilter
            label="Todas las bodegas"
            options={warehouses.map((w) => ({ value: w.id, label: `${w.name} (${w.code})` }))}
            selected={searchParams.get("warehouse_id")?.split(",").filter(Boolean) ?? []}
            onChange={(v) => updateFilter("warehouse_id", v.join(","))}
          />
          <MultiSelectFilter
            label="Todas las agencias"
            options={agencies.map((a) => ({ value: a.id, label: `${a.name} (${a.code})` }))}
            selected={searchParams.get("agency_id")?.split(",").filter(Boolean) ?? []}
            onChange={(v) => updateFilter("agency_id", v.join(","))}
          />
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
                const tab = searchParams.get("tab");
                if (search) params.set("search", search);
                if (tab) params.set("tab", tab);
                router.push(`${pathname}?${params.toString()}`);
              }}
              className="text-xs text-red-600 hover:text-red-800"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      )}

      {/* Table */}
      <div className={`overflow-auto rounded-lg border bg-white max-h-[calc(100vh-220px)] transition-opacity ${isFiltering ? "opacity-50" : ""}`}>
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 z-10 bg-white">
            <tr className="border-b text-xs font-medium uppercase tracking-wider text-gray-500">
              <th className="px-3 py-3">WR#</th>
              <th className="px-3 py-3">Tracking</th>
              <th className="px-3 py-3">Agencia</th>
              <th className="px-3 py-3">Consignatario</th>
              <th className="px-3 py-3">Piezas</th>
              <th className="px-3 py-3">Peso (lb)</th>
              <th className="px-3 py-3">Valor</th>
              <th className="px-3 py-3">Recibido</th>
              <th className="px-3 py-3">Ultimo cambio</th>
              <th className="px-3 py-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {typedData.length === 0 ? (
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
                return (
                  <React.Fragment key={groupKey}>
                    {/* Group header */}
                    <tr
                      className="border-t-2 border-gray-200 bg-gray-50 cursor-pointer select-none"
                      onClick={() => toggleCollapse(groupKey)}
                    >
                      <td colSpan={4} className="px-3 py-2.5">
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
                      <td className="px-3 py-2.5 text-center text-xs font-medium text-gray-500">
                        {totalPieces}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs font-medium text-gray-500">
                        {totalWeightLb.toFixed(1)}
                      </td>
                      <td colSpan={3} />
                      <td className="px-3 py-2.5 text-right text-xs text-gray-400">
                        {receipts.length} {receipts.length === 1 ? "recibo" : "recibos"}
                      </td>
                    </tr>
                    {/* Group rows */}
                    {!isCollapsed && receipts.map((wr) => {
                      const lastChange = getLastChange(wr.wr_status_history);
                      return (
                        <tr key={wr.id} className="border-t border-gray-100 hover:bg-gray-50">
                          <td className="px-3 py-2.5">
                            <Link
                              href={`/${locale}/warehouse-receipts/${wr.id}/edit?from=history`}
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
                          <td className="px-3 py-2.5 font-mono text-xs text-gray-600">
                            {wr.packages[0]?.tracking_number ?? "—"}
                            {wr.total_packages > 1 && (
                              <span className="ml-1 text-gray-400">(+{wr.total_packages - 1})</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-gray-600">
                            {wr.agencies?.code ?? "—"}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-gray-600 truncate max-w-[140px]">
                            {wr.consignees?.full_name ?? wr.consignee_name ?? "—"}
                          </td>
                          <td className="px-3 py-2.5 text-center text-xs">
                            {wr.total_pieces}
                          </td>
                          <td className="px-3 py-2.5 font-mono text-xs">
                            {wr.total_billable_weight_lb != null
                              ? Number(wr.total_billable_weight_lb).toFixed(1)
                              : "—"}
                          </td>
                          <td className="px-3 py-2.5 font-mono text-xs text-gray-600">
                            {wr.total_declared_value_usd != null
                              ? `$${Number(wr.total_declared_value_usd).toFixed(2)}`
                              : "—"}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-gray-400">
                            {new Date(wr.received_at).toLocaleDateString("es")}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-gray-400">
                            {lastChange
                              ? new Date(lastChange).toLocaleDateString("es")
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
    </div>
  );
}

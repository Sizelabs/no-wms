"use client";

import type { WrStatus } from "@no-wms/shared/constants/statuses";
import { WR_STATUS_LABELS } from "@no-wms/shared/constants/statuses";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React, { useCallback, useState, useTransition } from "react";

import { useUserRoles } from "@/components/auth/role-provider";
import { bulkUpdateStatus } from "@/lib/actions/warehouse-receipts";

interface PackageRow {
  id: string;
  tracking_number: string;
  carrier: string | null;
  actual_weight_lb: number | null;
  billable_weight_lb: number | null;
  is_damaged: boolean;
  damage_description: string | null;
  is_dgr: boolean;
  dgr_class: string | null;
  sender_name: string | null;
  pieces_count: number;
  warehouse_receipts: {
    id: string;
    wr_number: string;
    status: string;
    received_at: string;
    agencies: { name: string; code: string } | null;
    consignees: { full_name: string; casillero: string | null } | null;
  };
}

interface InventoryTableProps {
  data: PackageRow[];
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

function storageDays(receivedAt: string): number {
  const received = new Date(receivedAt);
  const now = new Date();
  return Math.floor((now.getTime() - received.getTime()) / (1000 * 60 * 60 * 24));
}

function storageDayColor(days: number): string {
  if (days > 60) return "text-red-600 font-medium";
  if (days > 30) return "text-yellow-600";
  return "text-gray-500";
}

function groupByConsignee(packages: PackageRow[]) {
  const groups = new Map<string, PackageRow[]>();
  for (const pkg of packages) {
    const key = pkg.warehouse_receipts.consignees?.full_name ?? "";
    const list = groups.get(key);
    if (list) {
      list.push(pkg);
    } else {
      groups.set(key, [pkg]);
    }
  }
  // Sort alphabetically, empty consignee last
  return [...groups.entries()].sort((a, b) => {
    if (!a[0]) return 1;
    if (!b[0]) return -1;
    return a[0].localeCompare(b[0]);
  });
}

export function InventoryTable({ data, count, locale, agencies = [], warehouses = [] }: InventoryTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const roles = useUserRoles();
  const canSelect = !roles.includes("agency");
  const [isPending, startTransition] = useTransition();
  const [showFilters, setShowFilters] = useState(false);

  // Track selected WR IDs (for bulk status updates)
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const grouped = groupByConsignee(data);

  // Deduplicate WR IDs from selected packages
  const selectedWrIds = new Set(
    data.filter((pkg) => selected.has(pkg.id)).map((pkg) => pkg.warehouse_receipts.id),
  );

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (selected.size === data.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(data.map((pkg) => pkg.id)));
    }
  }, [data, selected.size]);

  const handleBulkStatus = useCallback(
    (status: string) => {
      startTransition(async () => {
        await bulkUpdateStatus(Array.from(selectedWrIds), status);
        setSelected(new Set());
      });
    },
    [selectedWrIds],
  );

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

  const activeFilterCount = ["status", "agency_id", "warehouse_id", "is_damaged", "date_from", "date_to"]
    .filter((k) => searchParams.has(k)).length;

  return (
    <div className="space-y-3">
      {/* Search + primary filter row */}
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          defaultValue={searchParams.get("search") ?? ""}
          onChange={(e) => updateFilter("search", e.target.value)}
          placeholder="Buscar guía, remitente, descripción..."
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
        />
        <select
          defaultValue={searchParams.get("status") ?? ""}
          onChange={(e) => updateFilter("status", e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
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
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
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
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          >
            <option value="">Todas las agencias</option>
            {agencies.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.code})
              </option>
            ))}
          </select>
          <select
            defaultValue={searchParams.get("is_damaged") ?? ""}
            onChange={(e) => updateFilter("is_damaged", e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          >
            <option value="">Daño: Todos</option>
            <option value="true">Solo dañados</option>
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

      {/* Bulk actions */}
      {canSelect && selected.size > 0 && (
        <div className="flex items-center gap-2 rounded-md bg-gray-100 px-3 py-2 text-sm">
          <span className="font-medium">
            {selected.size} paquete(s) — {selectedWrIds.size} WR(s)
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
      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b text-xs font-medium uppercase tracking-wider text-gray-500">
              {canSelect && (
                <th className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={selected.size === data.length && data.length > 0}
                    onChange={toggleAll}
                    className="rounded border-gray-300"
                  />
                </th>
              )}
              <th className="px-3 py-3">Guía</th>
              <th className="px-3 py-3">WR#</th>
              <th className="px-3 py-3">Transportista</th>
              <th className="px-3 py-3">Agencia</th>
              <th className="px-3 py-3">Peso</th>
              <th className="px-3 py-3">Estado</th>
              <th className="px-3 py-3">Días</th>
              <th className="px-3 py-3">Recibido</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.length === 0 ? (
              <tr>
                <td colSpan={canSelect ? 9 : 8} className="px-3 py-8 text-center text-gray-400">
                  No se encontraron paquetes.
                </td>
              </tr>
            ) : (
              grouped.map(([consignee, packages]) => {
                const casillero = packages[0]?.warehouse_receipts.consignees?.casillero;
                const totalPieces = packages.reduce((sum, p) => sum + p.pieces_count, 0);
                const totalWeight = packages.reduce((sum, p) => sum + (Number(p.billable_weight_lb) || 0), 0);
                return (
                <React.Fragment key={consignee || "__none"}>
                  <tr className="bg-gray-50">
                    <td
                      colSpan={canSelect ? 9 : 8}
                      className="px-3 py-2 text-xs font-semibold text-gray-700"
                    >
                      {consignee || "Sin destinatario"}
                      {casillero && (
                        <span className="ml-1.5 font-mono font-normal text-gray-500">#{casillero}</span>
                      )}
                      <span className="ml-2 font-normal text-gray-400">
                        — {packages.length} {packages.length === 1 ? "paq" : "paqs"}, {totalPieces} pzs, {totalWeight.toFixed(1)} lb
                      </span>
                    </td>
                  </tr>
                  {packages.map((pkg) => {
                    const wr = pkg.warehouse_receipts;
                    const days = storageDays(wr.received_at);
                    return (
                      <tr key={pkg.id} className="hover:bg-gray-50">
                        {canSelect && (
                          <td className="px-3 py-2.5">
                            <input
                              type="checkbox"
                              checked={selected.has(pkg.id)}
                              onChange={() => toggleSelect(pkg.id)}
                              className="rounded border-gray-300"
                            />
                          </td>
                        )}
                        <td className="px-3 py-2.5">
                          <span className="font-mono text-xs font-medium text-gray-900">
                            {pkg.tracking_number}
                          </span>
                          {pkg.is_damaged && (
                            <span className="ml-1 inline-flex rounded bg-red-100 px-1 text-[10px] text-red-700">Daño</span>
                          )}
                          {pkg.is_dgr && (
                            <span className="ml-1 inline-flex rounded bg-orange-100 px-1 text-[10px] text-orange-700">DGR</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <Link
                            href={`/${locale}/inventory/${wr.id}`}
                            className="font-mono text-xs font-medium text-gray-600 hover:text-gray-900 hover:underline"
                          >
                            {wr.wr_number}
                          </Link>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-gray-600">
                          {pkg.carrier ?? "—"}
                        </td>
                        <td className="px-3 py-2.5 text-gray-600">
                          {wr.agencies?.code ?? "—"}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-xs">
                          {pkg.billable_weight_lb ? `${Number(pkg.billable_weight_lb).toFixed(1)} lb` : "—"}
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
                        <td className={`px-3 py-2.5 text-xs ${storageDayColor(days)}`}>
                          {days}d
                        </td>
                        <td className="px-3 py-2.5 text-xs text-gray-400">
                          {new Date(wr.received_at).toLocaleDateString("es")}
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
        <span>{count} paquete(s) en total</span>
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

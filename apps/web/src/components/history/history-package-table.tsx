"use client";

import type { WrStatus } from "@no-wms/shared/constants/statuses";
import { WR_STATUS_LABELS } from "@no-wms/shared/constants/statuses";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React, { useCallback, useState, useTransition } from "react";

import { MultiSelectFilter } from "@/components/ui/multi-select-filter";
import { formatDate } from "@/lib/format";

interface PackageRow {
  id: string;
  tracking_number: string;
  carrier: string | null;
  billable_weight_lb: number | null;
  is_damaged: boolean;
  is_dgr: boolean;
  warehouse_receipts: {
    id: string;
    wr_number: string;
    status: string;
    received_at: string;
    agencies: { name: string; code: string } | null;
    consignees: { full_name: string; casillero: string | null } | null;
  };
}

interface HistoryPackageTableProps {
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

export function HistoryPackageTable({ data, count, locale, agencies = [], warehouses = [] }: HistoryPackageTableProps) {
  const typedData = data as PackageRow[];
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);

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
          placeholder="Buscar guía, remitente, descripción..."
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
          <tbody>
            {typedData.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-gray-400">
                  No se encontraron paquetes.
                </td>
              </tr>
            ) : (
              typedData.map((pkg) => {
                const wr = pkg.warehouse_receipts;
                const days = storageDays(wr.received_at);
                return (
                  <tr key={pkg.id} className="border-t border-gray-100 hover:bg-gray-50">
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
                        href={`/${locale}/warehouse-receipts/${wr.id}/edit?from=history`}
                        className="font-mono text-xs font-medium text-gray-600 hover:text-gray-900 hover:underline"
                      >
                        {wr.wr_number}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-600">
                      {pkg.carrier ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-600">
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
                      {formatDate(wr.received_at)}
                    </td>
                  </tr>
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

"use client";

import type { WrStatus } from "@no-wms/shared/constants/statuses";
import { WR_STATUS_LABELS } from "@no-wms/shared/constants/statuses";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";

import { bulkUpdateStatus } from "@/lib/actions/warehouse-receipts";

interface WarehouseReceipt {
  id: string;
  wr_number: string;
  tracking_number: string;
  carrier: string | null;
  status: string;
  actual_weight_lb: number | null;
  billable_weight_lb: number | null;
  pieces_count: number;
  received_at: string;
  agencies: { name: string; code: string; type: string } | null;
  consignees: { full_name: string } | null;
}

interface InventoryTableProps {
  data: WarehouseReceipt[];
  count: number;
  locale: string;
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

export function InventoryTable({ data, count, locale }: InventoryTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [selected, setSelected] = useState<Set<string>>(new Set());

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
      setSelected(new Set(data.map((wr) => wr.id)));
    }
  }, [data, selected.size]);

  const handleBulkStatus = useCallback(
    (status: string) => {
      startTransition(async () => {
        await bulkUpdateStatus(Array.from(selected), status);
        setSelected(new Set());
      });
    },
    [selected],
  );

  const handleSearch = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set("search", value);
      } else {
        params.delete("search");
      }
      params.delete("offset");
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  const handleStatusFilter = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set("status", value);
      } else {
        params.delete("status");
      }
      params.delete("offset");
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  return (
    <div className="space-y-3">
      {/* Search + filters */}
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          defaultValue={searchParams.get("search") ?? ""}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Buscar guía, WR#, destinatario..."
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
        />
        <select
          defaultValue={searchParams.get("status") ?? ""}
          onChange={(e) => handleStatusFilter(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
        >
          <option value="">Todos los estados</option>
          {Object.entries(WR_STATUS_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 rounded-md bg-gray-100 px-3 py-2 text-sm">
          <span className="font-medium">{selected.size} seleccionado(s)</span>
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
              <th className="px-3 py-3">
                <input
                  type="checkbox"
                  checked={selected.size === data.length && data.length > 0}
                  onChange={toggleAll}
                  className="rounded border-gray-300"
                />
              </th>
              <th className="px-3 py-3">WR#</th>
              <th className="px-3 py-3">Guía</th>
              <th className="px-3 py-3">Agencia</th>
              <th className="px-3 py-3">Destinatario</th>
              <th className="px-3 py-3">Peso</th>
              <th className="px-3 py-3">Estado</th>
              <th className="px-3 py-3">Días</th>
              <th className="px-3 py-3">Recibido</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-gray-400">
                  No se encontraron recibos.
                </td>
              </tr>
            ) : (
              data.map((wr) => {
                const days = storageDays(wr.received_at);
                return (
                  <tr key={wr.id} className="hover:bg-gray-50">
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
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-gray-600">
                      {wr.tracking_number}
                    </td>
                    <td className="px-3 py-2.5 text-gray-600">
                      {wr.agencies?.code ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 text-gray-600">
                      {wr.consignees?.full_name ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs">
                      {wr.billable_weight_lb?.toFixed(1) ?? "—"} lb
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
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination info */}
      <div className="text-xs text-gray-500">
        {count} recibo(s) en total
      </div>
    </div>
  );
}

"use client";

import { WR_STATUS_LABELS, type WrStatus } from "@no-wms/shared/constants/statuses";

interface InventoryRow {
  id: string;
  wr_number: string;
  status: string;
  weight_lb: number | null;
  pieces: number | null;
  created_at: string;
  agencies: { name: string; code: string } | null;
  warehouses: { name: string } | null;
}

interface InventoryReportTableProps {
  data: InventoryRow[];
  summary: {
    totalWrs: number;
    totalWeight: number;
    totalPieces: number;
    byStatus: [string, number][];
  } | null;
}

export function InventoryReportTable({ data, summary }: InventoryReportTableProps) {
  return (
    <div className="space-y-4">
      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg border bg-white p-4">
            <p className="text-xs font-medium text-gray-500">Total WRs</p>
            <p className="mt-1 text-xl font-bold">{summary.totalWrs}</p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <p className="text-xs font-medium text-gray-500">Peso total (lb)</p>
            <p className="mt-1 text-xl font-bold">{summary.totalWeight.toFixed(2)}</p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <p className="text-xs font-medium text-gray-500">Total piezas</p>
            <p className="mt-1 text-xl font-bold">{summary.totalPieces}</p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <p className="text-xs font-medium text-gray-500">Por estado</p>
            <div className="mt-1 space-y-0.5">
              {summary.byStatus.map(([status, count]) => (
                <div key={status} className="flex justify-between text-xs">
                  <span className="text-gray-600">{WR_STATUS_LABELS[status as WrStatus] ?? status}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-auto rounded-lg border bg-white max-h-[calc(100vh-220px)]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-white">
            <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              <th className="px-4 py-3">WR #</th>
              <th className="px-4 py-3">Agencia</th>
              <th className="px-4 py-3">Bodega</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Peso (lb)</th>
              <th className="px-4 py-3 text-right">Piezas</th>
              <th className="px-4 py-3">Fecha</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-2 font-mono text-xs">{row.wr_number}</td>
                <td className="px-4 py-2 text-xs">{row.agencies?.name ?? "—"}</td>
                <td className="px-4 py-2 text-xs">{row.warehouses?.name ?? "—"}</td>
                <td className="px-4 py-2 text-xs">{WR_STATUS_LABELS[row.status as WrStatus] ?? row.status}</td>
                <td className="px-4 py-2 text-right text-xs">{Number(row.weight_lb ?? 0).toFixed(2)}</td>
                <td className="px-4 py-2 text-right text-xs">{row.pieces ?? 0}</td>
                <td className="px-4 py-2 text-xs text-gray-500">
                  {new Date(row.created_at).toLocaleDateString("es")}
                </td>
              </tr>
            ))}
            {!data.length && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-xs text-gray-400">
                  Sin datos
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

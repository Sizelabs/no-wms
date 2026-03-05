"use client";

import { SI_STATUS_LABELS, type SiStatus } from "@no-wms/shared/constants/statuses";

interface ShippingRow {
  id: string;
  si_number: string;
  status: string;
  modality: string;
  total_weight_lb: number | null;
  total_pieces: number | null;
  created_at: string;
  agencies: { name: string; code: string } | null;
  destinations: { city: string; country_code: string } | null;
}

interface ShippingReportTableProps {
  data: ShippingRow[];
  summary: {
    totalSIs: number;
    totalWeight: number;
    totalPieces: number;
    byStatus: [string, number][];
  } | null;
}

export function ShippingReportTable({ data, summary }: ShippingReportTableProps) {
  return (
    <div className="space-y-4">
      {summary && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg border bg-white p-4">
            <p className="text-xs font-medium text-gray-500">Total Embarques</p>
            <p className="mt-1 text-xl font-bold">{summary.totalSIs}</p>
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
                  <span className="text-gray-600">{SI_STATUS_LABELS[status as SiStatus] ?? status}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="overflow-auto rounded-lg border bg-white max-h-[calc(100vh-220px)]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-white">
            <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              <th className="px-4 py-3">SI #</th>
              <th className="px-4 py-3">Agencia</th>
              <th className="px-4 py-3">Destino</th>
              <th className="px-4 py-3">Modalidad</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Peso (lb)</th>
              <th className="px-4 py-3 text-right">Piezas</th>
              <th className="px-4 py-3">Fecha</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-2 font-mono text-xs">{row.si_number}</td>
                <td className="px-4 py-2 text-xs">{row.agencies?.name ?? "—"}</td>
                <td className="px-4 py-2 text-xs">{row.destinations?.city ?? "—"}</td>
                <td className="px-4 py-2 text-xs">{row.modality}</td>
                <td className="px-4 py-2 text-xs">{SI_STATUS_LABELS[row.status as SiStatus] ?? row.status}</td>
                <td className="px-4 py-2 text-right text-xs">{Number(row.total_weight_lb ?? 0).toFixed(2)}</td>
                <td className="px-4 py-2 text-right text-xs">{row.total_pieces ?? 0}</td>
                <td className="px-4 py-2 text-xs text-gray-500">
                  {new Date(row.created_at).toLocaleDateString("es")}
                </td>
              </tr>
            ))}
            {!data.length && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-xs text-gray-400">Sin datos</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

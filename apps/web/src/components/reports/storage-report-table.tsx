"use client";

interface StorageRow {
  id: string;
  wr_number: string;
  status: string;
  received_at: string;
  weight_lb: number | null;
  days_in_storage: number;
  agencies: { name: string; code: string } | null;
  warehouses: { name: string } | null;
}

interface StorageReportTableProps {
  data: StorageRow[];
}

export function StorageReportTable({ data }: StorageReportTableProps) {
  const alertThreshold = 30;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs font-medium text-gray-500">Total en almacén</p>
          <p className="mt-1 text-xl font-bold">{data.length}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs font-medium text-gray-500">Con alerta (&gt;{alertThreshold} días)</p>
          <p className="mt-1 text-xl font-bold text-red-700">
            {data.filter((r) => r.days_in_storage > alertThreshold).length}
          </p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs font-medium text-gray-500">Promedio días</p>
          <p className="mt-1 text-xl font-bold">
            {data.length ? Math.round(data.reduce((s, r) => s + r.days_in_storage, 0) / data.length) : 0}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              <th className="px-4 py-3">WR #</th>
              <th className="px-4 py-3">Agencia</th>
              <th className="px-4 py-3">Bodega</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Peso (lb)</th>
              <th className="px-4 py-3 text-right">Días</th>
              <th className="px-4 py-3">Recibido</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.map((row) => (
              <tr key={row.id} className={row.days_in_storage > alertThreshold ? "bg-red-50" : ""}>
                <td className="px-4 py-2 font-mono text-xs">{row.wr_number}</td>
                <td className="px-4 py-2 text-xs">{row.agencies?.name ?? "—"}</td>
                <td className="px-4 py-2 text-xs">{row.warehouses?.name ?? "—"}</td>
                <td className="px-4 py-2 text-xs">{row.status}</td>
                <td className="px-4 py-2 text-right text-xs">{Number(row.weight_lb ?? 0).toFixed(2)}</td>
                <td className="px-4 py-2 text-right text-xs font-medium">
                  <span className={row.days_in_storage > alertThreshold ? "text-red-700" : ""}>
                    {row.days_in_storage}
                  </span>
                </td>
                <td className="px-4 py-2 text-xs text-gray-500">
                  {new Date(row.received_at).toLocaleDateString("es")}
                </td>
              </tr>
            ))}
            {!data.length && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-xs text-gray-400">Sin datos</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

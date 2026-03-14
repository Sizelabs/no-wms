"use client";

import { INVOICE_STATUS_LABELS, type InvoiceStatus } from "@no-wms/shared/constants/statuses";

import { formatDate } from "@/lib/format";

interface BillingRow {
  id: string;
  invoice_number: string;
  status: string;
  subtotal: number;
  tax: number;
  total: number;
  due_date: string | null;
  paid_at: string | null;
  created_at: string;
  agencies: { name: string; code: string } | null;
}

interface BillingReportTableProps {
  data: BillingRow[];
  summary: {
    totalInvoices: number;
    totalBilled: number;
    totalPaid: number;
    outstanding: number;
    byStatus: [string, number][];
  } | null;
}

export function BillingReportTable({ data, summary }: BillingReportTableProps) {
  return (
    <div className="space-y-4">
      {summary && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg border bg-white p-4">
            <p className="text-xs font-medium text-gray-500">Total facturado</p>
            <p className="mt-1 text-xl font-bold">${summary.totalBilled.toFixed(2)}</p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <p className="text-xs font-medium text-gray-500">Total cobrado</p>
            <p className="mt-1 text-xl font-bold text-green-700">${summary.totalPaid.toFixed(2)}</p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <p className="text-xs font-medium text-gray-500">Saldo pendiente</p>
            <p className="mt-1 text-xl font-bold text-red-700">${summary.outstanding.toFixed(2)}</p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <p className="text-xs font-medium text-gray-500">Por estado</p>
            <div className="mt-1 space-y-0.5">
              {summary.byStatus.map(([status, count]) => (
                <div key={status} className="flex justify-between text-xs">
                  <span className="text-gray-600">{INVOICE_STATUS_LABELS[status as InvoiceStatus] ?? status}</span>
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
              <th className="px-4 py-3">Factura #</th>
              <th className="px-4 py-3">Agencia</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3">Vencimiento</th>
              <th className="px-4 py-3">Pagada</th>
              <th className="px-4 py-3">Creada</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-2 font-mono text-xs">{row.invoice_number}</td>
                <td className="px-4 py-2 text-xs">{row.agencies?.name ?? "—"}</td>
                <td className="px-4 py-2 text-xs">{INVOICE_STATUS_LABELS[row.status as InvoiceStatus] ?? row.status}</td>
                <td className="px-4 py-2 text-right text-xs font-medium">${Number(row.total).toFixed(2)}</td>
                <td className="px-4 py-2 text-xs text-gray-500">
                  {row.due_date ? formatDate(row.due_date) : "—"}
                </td>
                <td className="px-4 py-2 text-xs text-gray-500">
                  {row.paid_at ? formatDate(row.paid_at) : "—"}
                </td>
                <td className="px-4 py-2 text-xs text-gray-500">
                  {formatDate(row.created_at)}
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

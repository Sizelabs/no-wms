"use client";

import { INVOICE_STATUS_LABELS } from "@no-wms/shared/constants/statuses";
import Link from "next/link";
import { useState } from "react";

import { InvoiceStatusBadge } from "@/components/invoicing/invoice-status-badge";

interface Invoice {
  id: string;
  invoice_number: string;
  status: string;
  period_start: string;
  period_end: string;
  subtotal: number;
  tax: number;
  total: number;
  due_date: string | null;
  paid_at: string | null;
  created_at: string;
  agencies: { name: string; code: string } | null;
}

interface InvoiceListProps {
  data: Invoice[];
}

export function InvoiceList({ data }: InvoiceListProps) {
  const [filter, setFilter] = useState({ status: "", agency: "" });

  const filtered = data.filter((inv) => {
    if (filter.status && inv.status !== filter.status) return false;
    if (filter.agency && inv.agencies?.code !== filter.agency) return false;
    return true;
  });

  const agencies = [...new Set(data.map((inv) => inv.agencies?.code).filter(Boolean))];

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <select
          value={filter.status}
          onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="">Todos los estados</option>
          {Object.entries(INVOICE_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          value={filter.agency}
          onChange={(e) => setFilter((f) => ({ ...f, agency: e.target.value }))}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="">Todas las agencias</option>
          {agencies.map((code) => (
            <option key={code} value={code}>{code}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              <th className="px-4 py-3">Factura #</th>
              <th className="px-4 py-3">Agencia</th>
              <th className="px-4 py-3">Periodo</th>
              <th className="px-4 py-3 text-right">Subtotal</th>
              <th className="px-4 py-3 text-right">Impuesto</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Vencimiento</th>
              <th className="px-4 py-3">Pagada</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((inv) => (
              <tr key={inv.id}>
                <td className="px-4 py-3 font-mono text-xs">{inv.invoice_number}</td>
                <td className="px-4 py-3 text-xs">
                  {inv.agencies ? `${inv.agencies.name} (${inv.agencies.code})` : "—"}
                </td>
                <td className="px-4 py-3 text-xs">
                  {new Date(inv.period_start).toLocaleDateString("es")} —{" "}
                  {new Date(inv.period_end).toLocaleDateString("es")}
                </td>
                <td className="px-4 py-3 text-right text-xs">${Number(inv.subtotal).toFixed(2)}</td>
                <td className="px-4 py-3 text-right text-xs">${Number(inv.tax).toFixed(2)}</td>
                <td className="px-4 py-3 text-right text-xs font-medium">
                  ${Number(inv.total).toFixed(2)}
                </td>
                <td className="px-4 py-3">
                  <InvoiceStatusBadge status={inv.status} />
                </td>
                <td className="px-4 py-3 text-xs">
                  {inv.due_date ? new Date(inv.due_date).toLocaleDateString("es") : "—"}
                </td>
                <td className="px-4 py-3 text-xs">
                  {inv.paid_at ? new Date(inv.paid_at).toLocaleDateString("es") : "—"}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`invoicing/${inv.id}`}
                    className="rounded border px-2 py-0.5 text-xs text-blue-700 hover:bg-blue-50"
                  >
                    Ver
                  </Link>
                </td>
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-gray-400">
                  No hay facturas
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

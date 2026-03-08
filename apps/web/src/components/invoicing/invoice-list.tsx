"use client";

import { INVOICE_STATUS_LABELS } from "@no-wms/shared/constants/statuses";
import Link from "next/link";
import { useState } from "react";

import { InvoiceStatusBadge } from "@/components/invoicing/invoice-status-badge";
import { MultiSelectFilter } from "@/components/ui/multi-select-filter";
import { VirtualTableBody } from "@/components/ui/virtual-table-body";

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
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState({ status: [] as string[], agency: [] as string[] });
  const [showFilters, setShowFilters] = useState(false);
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);

  const filtered = data.filter((inv) => {
    if (search) {
      const q = search.toLowerCase();
      const matches =
        inv.invoice_number.toLowerCase().includes(q) ||
        inv.agencies?.name?.toLowerCase().includes(q) ||
        inv.agencies?.code?.toLowerCase().includes(q);
      if (!matches) return false;
    }
    if (filter.status.length > 0 && !filter.status.includes(inv.status)) return false;
    if (filter.agency.length > 0 && !filter.agency.includes(inv.agencies?.code ?? "")) return false;
    return true;
  });

  const agencies = [...new Set(data.map((inv) => inv.agencies?.code).filter(Boolean))];
  const activeFilterCount = [filter.agency.length > 0].filter(Boolean).length;

  return (
    <div className="space-y-3">
      {/* Search + primary filter row */}
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar factura, agencia..."
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
        />
        <MultiSelectFilter
          label="Todos los estados"
          options={Object.entries(INVOICE_STATUS_LABELS).map(([k, v]) => ({ value: k, label: v }))}
          selected={filter.status}
          onChange={(v) => setFilter((f) => ({ ...f, status: v }))}
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
            label="Todas las agencias"
            options={agencies.map((code) => ({ value: code!, label: code! }))}
            selected={filter.agency}
            onChange={(v) => setFilter((f) => ({ ...f, agency: v }))}
          />
          {activeFilterCount > 0 && (
            <button
              onClick={() => setFilter((f) => ({ ...f, agency: [] }))}
              className="text-xs text-red-600 hover:text-red-800"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      )}

      <div ref={setScrollEl} className="overflow-auto rounded-lg border bg-white max-h-[calc(100vh-220px)]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-white">
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
          <VirtualTableBody
            items={filtered}
            scrollElement={scrollEl}
            colSpan={10}
            emptyMessage="No hay facturas"
            renderRow={(inv) => (
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
            )}
          />
        </table>
      </div>
    </div>
  );
}

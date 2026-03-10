"use client";

import { MODALITY_LABELS } from "@no-wms/shared/constants/modalities";
import { SI_STATUS_LABELS } from "@no-wms/shared/constants/statuses";
import { useState, useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import { MultiSelectFilter } from "@/components/ui/multi-select-filter";
import { VirtualTableBody } from "@/components/ui/virtual-table-body";
import {
  approveShippingInstruction,
  finalizeShippingInstruction,
  rejectShippingInstruction,
} from "@/lib/actions/shipping-instructions";

interface ShippingInstruction {
  id: string;
  si_number: string;
  modality: string;
  status: string;
  total_pieces: number | null;
  total_billable_weight_lb: number | null;
  created_at: string;
  agencies: { name: string; code: string } | null;
  consignees: { full_name: string } | null;
  hawbs: { hawb_number: string }[];
  shipping_instruction_items: { warehouse_receipt_id: string }[];
}

interface SiListProps {
  data: ShippingInstruction[];
}

const STATUS_COLORS: Record<string, string> = {
  requested: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  finalized: "bg-purple-100 text-purple-800",
  manifested: "bg-indigo-100 text-indigo-800",
  rejected: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-500",
};

export function SiList({ data }: SiListProps) {
  const { notify } = useNotification();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState({ status: [] as string[], modality: [] as string[] });
  const [showFilters, setShowFilters] = useState(false);
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);

  const filtered = data.filter((si) => {
    if (search) {
      const q = search.toLowerCase();
      const matches =
        si.si_number.toLowerCase().includes(q) ||
        si.agencies?.name?.toLowerCase().includes(q) ||
        si.agencies?.code?.toLowerCase().includes(q) ||
        si.consignees?.full_name?.toLowerCase().includes(q) ||
        si.hawbs.some((h) => h.hawb_number.toLowerCase().includes(q));
      if (!matches) return false;
    }
    if (filter.status.length > 0 && !filter.status.includes(si.status)) return false;
    if (filter.modality.length > 0 && !filter.modality.includes(si.modality)) return false;
    return true;
  });

  const activeFilterCount = [filter.modality].filter((f) => f.length > 0).length;

  const handleApprove = (id: string) => {
    startTransition(async () => {
      await approveShippingInstruction(id);
    });
  };

  const handleReject = (id: string) => {
    const reason = prompt("Razón del rechazo:");
    if (!reason) return;
    startTransition(async () => {
      await rejectShippingInstruction(id, reason);
    });
  };

  const handleFinalize = (id: string) => {
    startTransition(async () => {
      const result = await finalizeShippingInstruction(id);
      if (result.hawb_number) {
        notify(`HAWB generado: ${result.hawb_number}`, "success");
      } else if (result.error) {
        notify(result.error, "error");
      }
    });
  };

  return (
    <div className="space-y-3">
      {/* Search + primary filter row */}
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar SI, agencia, consignatario, HAWB..."
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
        />
        <MultiSelectFilter
          label="Todos los estados"
          options={Object.entries(SI_STATUS_LABELS).map(([k, v]) => ({ value: k, label: v }))}
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
            label="Todas las modalidades"
            options={Object.entries(MODALITY_LABELS).map(([k, v]) => ({ value: k, label: v }))}
            selected={filter.modality}
            onChange={(v) => setFilter((f) => ({ ...f, modality: v }))}
          />
          {activeFilterCount > 0 && (
            <button
              onClick={() => setFilter((f) => ({ ...f, modality: [] }))}
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
              <th className="px-4 py-3">SI #</th>
              <th className="px-4 py-3">Modalidad</th>
              <th className="px-4 py-3">Agencia</th>
              <th className="px-4 py-3">Consignatario</th>
              <th className="px-4 py-3">WRs</th>
              <th className="px-4 py-3">Peso</th>
              <th className="px-4 py-3">HAWB</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <VirtualTableBody
            items={filtered}
            scrollElement={scrollEl}
            colSpan={10}
            emptyMessage="No hay instrucciones de embarque"
            renderRow={(si) => (
              <tr key={si.id}>
                <td className="px-4 py-3 font-mono text-xs">{si.si_number}</td>
                <td className="px-4 py-3 text-xs">
                  {MODALITY_LABELS[si.modality as keyof typeof MODALITY_LABELS] ?? si.modality}
                </td>
                <td className="px-4 py-3 text-xs">
                  {si.agencies ? `${si.agencies.name} (${si.agencies.code})` : "—"}
                </td>
                <td className="px-4 py-3 text-xs">{si.consignees?.full_name ?? "—"}</td>
                <td className="px-4 py-3 text-xs">{si.shipping_instruction_items.length}</td>
                <td className="px-4 py-3 text-xs">
                  {si.total_billable_weight_lb ? `${si.total_billable_weight_lb} lb` : "—"}
                </td>
                <td className="px-4 py-3 font-mono text-xs">
                  {si.hawbs.length ? si.hawbs.map((h) => h.hawb_number).join(", ") : "—"}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[si.status] ?? ""}`}>
                    {SI_STATUS_LABELS[si.status as keyof typeof SI_STATUS_LABELS] ?? si.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {new Date(si.created_at).toLocaleDateString("es")}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {si.status === "requested" && (
                      <>
                        <button
                          onClick={() => handleApprove(si.id)}
                          disabled={isPending}
                          className="rounded border px-2 py-0.5 text-xs text-green-700 hover:bg-green-50"
                        >
                          Aprobar
                        </button>
                        <button
                          onClick={() => handleReject(si.id)}
                          disabled={isPending}
                          className="rounded border px-2 py-0.5 text-xs text-red-700 hover:bg-red-50"
                        >
                          Rechazar
                        </button>
                      </>
                    )}
                    {si.status === "approved" && (
                      <button
                        onClick={() => handleFinalize(si.id)}
                        disabled={isPending}
                        className="rounded border px-2 py-0.5 text-xs text-purple-700 hover:bg-purple-50"
                      >
                        Finalizar (HAWB)
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          />
        </table>
      </div>
    </div>
  );
}

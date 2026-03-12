"use client";

import { WO_STATUS_LABELS } from "@no-wms/shared/constants/statuses";
import { WORK_ORDER_TYPE_LABELS } from "@no-wms/shared/constants/work-order-types";
import Link from "next/link";
import { useState, useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import { MultiSelectFilter } from "@/components/ui/multi-select-filter";
import { VirtualTableBody } from "@/components/ui/virtual-table-body";
import { updateWorkOrderStatus } from "@/lib/actions/work-orders";

interface WorkOrder {
  id: string;
  wo_number: string;
  type: string;
  status: string;
  priority: string;
  instructions: string | null;
  created_at: string;
  agencies: { name: string; code: string; type: string } | null;
  profiles: { full_name: string } | null;
  work_order_items: { warehouse_receipt_id: string }[];
}

interface WoListProps {
  data: WorkOrder[];
  locale: string;
  canUpdate?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  requested: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  completed: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
  pending: "bg-orange-100 text-orange-800",
};

const PRIORITY_BADGE: Record<string, string> = {
  high: "bg-red-500 text-white",
  normal: "bg-gray-200 text-gray-700",
  low: "bg-gray-100 text-gray-500",
};

export function WoList({ data, locale, canUpdate = false }: WoListProps) {
  const [isPending, startTransition] = useTransition();
  const { notify } = useNotification();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState({ status: [] as string[], type: [] as string[] });
  const [showFilters, setShowFilters] = useState(false);
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);

  const filtered = data.filter((wo) => {
    if (search) {
      const q = search.toLowerCase();
      const matches =
        wo.wo_number.toLowerCase().includes(q) ||
        wo.agencies?.name?.toLowerCase().includes(q) ||
        wo.agencies?.code?.toLowerCase().includes(q) ||
        wo.profiles?.full_name?.toLowerCase().includes(q);
      if (!matches) return false;
    }
    if (filter.status.length > 0 && !filter.status.includes(wo.status)) return false;
    if (filter.type.length > 0 && !filter.type.includes(wo.type)) return false;
    return true;
  });

  const hasActions = canUpdate && data.some((wo) => !["completed", "cancelled"].includes(wo.status));

  const activeFilterCount = [filter.type.length > 0].filter(Boolean).length;

  const handleStatusChange = (woId: string, newStatus: string) => {
    if (newStatus === "completed") {
      const notes = prompt("Notas de resultado (requeridas):");
      if (!notes?.trim()) return;
      const fd = new FormData();
      fd.set("result_notes", notes);
      startTransition(async () => {
        const result = await updateWorkOrderStatus(woId, newStatus, fd);
        if (result.error) notify(result.error, "error");
        else notify("Orden de trabajo completada", "success");
      });
    } else if (newStatus === "cancelled") {
      const reason = prompt("Razón de cancelación:");
      const fd = new FormData();
      fd.set("cancellation_reason", reason ?? "");
      startTransition(async () => {
        const result = await updateWorkOrderStatus(woId, newStatus, fd);
        if (result.error) notify(result.error, "error");
        else notify("Orden de trabajo cancelada", "success");
      });
    } else {
      startTransition(async () => {
        const result = await updateWorkOrderStatus(woId, newStatus);
        if (result.error) notify(result.error, "error");
        else notify("Estado actualizado", "success");
      });
    }
  };

  return (
    <div className="space-y-3">
      {/* Search + primary filter row */}
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar OT, agencia, responsable..."
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
        />
        <MultiSelectFilter
          label="Todos los estados"
          options={Object.entries(WO_STATUS_LABELS).map(([k, v]) => ({ value: k, label: v }))}
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
            label="Todos los tipos"
            options={Object.entries(WORK_ORDER_TYPE_LABELS).map(([k, v]) => ({ value: k, label: v }))}
            selected={filter.type}
            onChange={(v) => setFilter((f) => ({ ...f, type: v }))}
          />
          {activeFilterCount > 0 && (
            <button
              onClick={() => setFilter((f) => ({ ...f, type: [] }))}
              className="text-xs text-red-600 hover:text-red-800"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      )}

      {/* Table */}
      <div ref={setScrollEl} className="overflow-auto rounded-lg border bg-white max-h-[calc(100vh-220px)]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-white">
            <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              <th className="px-4 py-3">OT #</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Agencia</th>
              <th className="px-4 py-3">Prioridad</th>
              <th className="px-4 py-3">WRs</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Fecha</th>
              {hasActions && <th className="px-4 py-3">Acciones</th>}
            </tr>
          </thead>
          <VirtualTableBody
            items={filtered}
            scrollElement={scrollEl}
            colSpan={hasActions ? 8 : 7}
            emptyMessage="No hay órdenes de trabajo"
            renderRow={(wo) => (
              <tr key={wo.id}>
                <td className="px-4 py-3 font-mono text-xs">
                  <Link href={`/${locale}/work-orders/${wo.id}`} className="hover:underline">
                    {wo.wo_number}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  {WORK_ORDER_TYPE_LABELS[wo.type as keyof typeof WORK_ORDER_TYPE_LABELS] ?? wo.type}
                </td>
                <td className="px-4 py-3 text-xs">
                  {wo.agencies ? `${wo.agencies.name} (${wo.agencies.code})` : "—"}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_BADGE[wo.priority] ?? ""}`}>
                    {wo.priority === "high" ? "Alta" : wo.priority === "low" ? "Baja" : "Normal"}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs">{wo.work_order_items.length}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[wo.status] ?? ""}`}>
                    {WO_STATUS_LABELS[wo.status as keyof typeof WO_STATUS_LABELS] ?? wo.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {new Date(wo.created_at).toLocaleDateString("es")}
                </td>
                {hasActions && (
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {wo.status === "requested" && (
                      <button
                        onClick={() => handleStatusChange(wo.id, "approved")}
                        disabled={isPending}
                        className="rounded border px-2 py-0.5 text-xs text-green-700 hover:bg-green-50"
                      >
                        Aprobar
                      </button>
                    )}
                    {wo.status === "pending" && (
                      <button
                        onClick={() => handleStatusChange(wo.id, "approved")}
                        disabled={isPending}
                        className="rounded border px-2 py-0.5 text-xs text-green-700 hover:bg-green-50"
                      >
                        Aprobar
                      </button>
                    )}
                    {wo.status === "approved" && (
                      <button
                        onClick={() => handleStatusChange(wo.id, "in_progress")}
                        disabled={isPending}
                        className="rounded border px-2 py-0.5 text-xs text-blue-700 hover:bg-blue-50"
                      >
                        Iniciar
                      </button>
                    )}
                    {wo.status === "in_progress" && (
                      <button
                        onClick={() => handleStatusChange(wo.id, "completed")}
                        disabled={isPending}
                        className="rounded border px-2 py-0.5 text-xs text-green-700 hover:bg-green-50"
                      >
                        Completar
                      </button>
                    )}
                    {!["completed", "cancelled"].includes(wo.status) && (
                      <button
                        onClick={() => handleStatusChange(wo.id, "cancelled")}
                        disabled={isPending}
                        className="rounded border px-2 py-0.5 text-xs text-red-700 hover:bg-red-50"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </td>
                )}
              </tr>
            )}
          />
        </table>
      </div>
    </div>
  );
}

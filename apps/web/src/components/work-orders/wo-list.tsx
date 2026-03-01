"use client";

import { WO_STATUS_LABELS } from "@no-wms/shared/constants/statuses";
import { WORK_ORDER_TYPE_LABELS } from "@no-wms/shared/constants/work-order-types";
import Link from "next/link";
import { useState, useTransition } from "react";

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

export function WoList({ data, locale }: WoListProps) {
  const [isPending, startTransition] = useTransition();
  const [filter, setFilter] = useState({ status: "", type: "" });

  const filtered = data.filter((wo) => {
    if (filter.status && wo.status !== filter.status) return false;
    if (filter.type && wo.type !== filter.type) return false;
    return true;
  });

  const handleStatusChange = (woId: string, newStatus: string) => {
    if (newStatus === "completed") {
      const notes = prompt("Notas de resultado (requeridas):");
      if (!notes?.trim()) return;
      const fd = new FormData();
      fd.set("result_notes", notes);
      startTransition(async () => {
        await updateWorkOrderStatus(woId, newStatus, fd);
      });
    } else if (newStatus === "cancelled") {
      const reason = prompt("Razón de cancelación:");
      const fd = new FormData();
      fd.set("cancellation_reason", reason ?? "");
      startTransition(async () => {
        await updateWorkOrderStatus(woId, newStatus, fd);
      });
    } else {
      startTransition(async () => {
        await updateWorkOrderStatus(woId, newStatus);
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-3">
        <select
          value={filter.status}
          onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="">Todos los estados</option>
          {Object.entries(WO_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          value={filter.type}
          onChange={(e) => setFilter((f) => ({ ...f, type: e.target.value }))}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="">Todos los tipos</option>
          {Object.entries(WORK_ORDER_TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              <th className="px-4 py-3">OT #</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Agencia</th>
              <th className="px-4 py-3">Prioridad</th>
              <th className="px-4 py-3">WRs</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((wo) => (
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
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                  No hay órdenes de trabajo
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

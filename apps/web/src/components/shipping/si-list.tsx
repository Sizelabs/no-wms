"use client";

import { MODALITY_LABELS } from "@no-wms/shared/constants/modalities";
import { SI_STATUS_LABELS } from "@no-wms/shared/constants/statuses";
import { useState, useTransition } from "react";

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
  consignees: { name: string } | null;
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
  const [isPending, startTransition] = useTransition();
  const [filter, setFilter] = useState({ status: "", modality: "" });

  const filtered = data.filter((si) => {
    if (filter.status && si.status !== filter.status) return false;
    if (filter.modality && si.modality !== filter.modality) return false;
    return true;
  });

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
        alert(`HAWB generado: ${result.hawb_number}`);
      } else if (result.error) {
        alert(result.error);
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <select
          value={filter.status}
          onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="">Todos los estados</option>
          {Object.entries(SI_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          value={filter.modality}
          onChange={(e) => setFilter((f) => ({ ...f, modality: e.target.value }))}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="">Todas las modalidades</option>
          {Object.entries(MODALITY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead>
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
          <tbody className="divide-y">
            {filtered.map((si) => (
              <tr key={si.id}>
                <td className="px-4 py-3 font-mono text-xs">{si.si_number}</td>
                <td className="px-4 py-3 text-xs">
                  {MODALITY_LABELS[si.modality as keyof typeof MODALITY_LABELS] ?? si.modality}
                </td>
                <td className="px-4 py-3 text-xs">
                  {si.agencies ? `${si.agencies.name} (${si.agencies.code})` : "—"}
                </td>
                <td className="px-4 py-3 text-xs">{si.consignees?.name ?? "—"}</td>
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
            ))}
            {!filtered.length && (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-gray-400">
                  No hay instrucciones de embarque
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

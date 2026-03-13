"use client";

import { useEffect, useState, useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import { assignSiToShipment, getUnassignedFinalizedSIs } from "@/lib/actions/shipments";

interface UnassignedSI {
  id: string;
  si_number: string;
  total_pieces: number | null;
  total_billable_weight_lb: number | null;
  agencies: { name: string; code: string } | null;
}

interface HouseBillAssignmentPanelProps {
  shipmentId: string;
  modality: string;
}

export function HouseBillAssignmentPanel({ shipmentId, modality }: HouseBillAssignmentPanelProps) {
  const { notify } = useNotification();
  const [isPending, startTransition] = useTransition();
  const [sis, setSis] = useState<UnassignedSI[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getUnassignedFinalizedSIs(modality).then((res) => {
      setSis((res.data as unknown as UnassignedSI[]) ?? []);
      setLoading(false);
    });
  }, [modality]);

  const handleAssign = (siId: string) => {
    startTransition(async () => {
      const res = await assignSiToShipment(siId, shipmentId);
      if (res.error) {
        notify(res.error, "error");
      } else {
        notify("SI asignada al embarque — guía generada", "success");
        setSis((prev) => prev.filter((s) => s.id !== siId));
      }
    });
  };

  if (loading) {
    return <p className="text-sm text-gray-500">Cargando SIs finalizadas...</p>;
  }

  if (sis.length === 0) {
    return <p className="text-sm text-gray-500">No hay SIs finalizadas sin asignar para esta modalidad.</p>;
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-gray-900">SIs finalizadas sin asignar</h3>
      <div className="overflow-auto rounded-lg border max-h-64">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-white">
            <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              <th className="px-3 py-2">SI #</th>
              <th className="px-3 py-2">Agencia</th>
              <th className="px-3 py-2">Pzas</th>
              <th className="px-3 py-2">Peso</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sis.map((si) => (
              <tr key={si.id}>
                <td className="px-3 py-2 font-mono text-xs">{si.si_number}</td>
                <td className="px-3 py-2 text-xs">{si.agencies?.name ?? "—"}</td>
                <td className="px-3 py-2 text-xs">{si.total_pieces ?? "—"}</td>
                <td className="px-3 py-2 text-xs">{si.total_billable_weight_lb ? `${Number(si.total_billable_weight_lb).toFixed(1)} lb` : "—"}</td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => handleAssign(si.id)}
                    disabled={isPending}
                    className="rounded border px-2 py-0.5 text-xs text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                  >
                    Asignar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

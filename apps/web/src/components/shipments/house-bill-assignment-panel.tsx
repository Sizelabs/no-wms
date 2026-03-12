"use client";

import { useEffect, useState, useTransition } from "react";

import { useNotification } from "@/components/layout/notification";
import { assignHouseBillToShipment, getUnassignedHouseBills } from "@/lib/actions/shipments";

interface HouseBillItem {
  id: string;
  hawb_number: string;
  document_type: string;
  pieces: number | null;
  weight_lb: number | null;
  shipping_instructions: {
    si_number: string;
    agencies: { name: string; code: string } | null;
  } | null;
}

interface HouseBillAssignmentPanelProps {
  shipmentId: string;
  modality: string;
}

export function HouseBillAssignmentPanel({ shipmentId, modality }: HouseBillAssignmentPanelProps) {
  const { notify } = useNotification();
  const [isPending, startTransition] = useTransition();
  const [houseBills, setHouseBills] = useState<HouseBillItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getUnassignedHouseBills(modality).then((res) => {
      setHouseBills((res.data as HouseBillItem[]) ?? []);
      setLoading(false);
    });
  }, [modality]);

  const handleAssign = (houseBillId: string) => {
    startTransition(async () => {
      const res = await assignHouseBillToShipment(houseBillId, shipmentId);
      if (res.error) {
        notify(res.error, "error");
      } else {
        notify("House bill asignado al embarque", "success");
        setHouseBills((prev) => prev.filter((h) => h.id !== houseBillId));
      }
    });
  };

  if (loading) {
    return <p className="text-sm text-gray-500">Cargando house bills...</p>;
  }

  if (houseBills.length === 0) {
    return <p className="text-sm text-gray-500">No hay house bills sin asignar para esta modalidad.</p>;
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-gray-900">House Bills sin asignar</h3>
      <div className="overflow-auto rounded-lg border max-h-64">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-white">
            <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">SI</th>
              <th className="px-3 py-2">Agencia</th>
              <th className="px-3 py-2">Pzas</th>
              <th className="px-3 py-2">Peso</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {houseBills.map((hb) => (
              <tr key={hb.id}>
                <td className="px-3 py-2 font-mono text-xs">{hb.hawb_number}</td>
                <td className="px-3 py-2 text-xs">{hb.shipping_instructions?.si_number ?? "—"}</td>
                <td className="px-3 py-2 text-xs">{hb.shipping_instructions?.agencies?.name ?? "—"}</td>
                <td className="px-3 py-2 text-xs">{hb.pieces ?? "—"}</td>
                <td className="px-3 py-2 text-xs">{hb.weight_lb ? `${hb.weight_lb} lb` : "—"}</td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => handleAssign(hb.id)}
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
